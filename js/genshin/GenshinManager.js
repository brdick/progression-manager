import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.3.0/+esm';

// Essential imports only
const { Renderer } = await window.importer.get(`js/Renderer.js`);
const {default:DataManager} = await window.importer.get(`js/DataManager.js`);
const {default:FarmingPlanner} = await window.importer.get(`js/genshin/FarmingPlanner.js`);

console.debug(`Essential imports loaded.`);

export default class GenshinManager extends DataManager
{
  static dontSerialize = super.dontSerialize.concat(["lastDay"]);
  static templateName = "genshin/renderManager";
  static timezones = {
    'na': "UTC-9",
    'eu': "UTC-3",
    'as': "UTC+4",
    'tw': "UTC+4",
  };
  
  lastDay = DateTime.now().setZone("UTC-9").weekdayLong;
  buildData = {};//GenshinBuilds;
  
  constructor()
  {
    super();
    this.elements['loadModal'] = document.getElementById("loadModal");
    this.elements['loadError'] = document.getElementById("loadError");
    this.initialized = false;
    this.minimalMode = false;
  }
  
  async initMinimal()
  {
    console.log('Initializing minimal GenshinManager (no data)');
    this.minimalMode = true;
    
    // Basic setup without loading heavy components
    this.elements['header'] = document.getElementById("viewerHeader");
    this.elements['main'] = document.getElementById("viewerMain");
    this.elements['popup'] = document.getElementById("viewerPopup");
    this.elements['nav'] = document.querySelector("#viewerHeader nav");
    
    // Initialize farming planner only (lightweight)
    this.farmingPlanner = new FarmingPlanner(this);
    
    // Setup basic navigation
    this.renderNav();
    
    // Render empty state
    await this.renderEmptyState();
    
    this.initialized = true;
    console.log('Minimal GenshinManager initialized successfully');
  }
  
  async ensureFullInitialization()
  {
    if (!this.initialized || this.minimalMode) {
      try {
        console.log('Upgrading to full initialization...');
        
        // Import essential components with fallback handling
        const loadResults = await Promise.allSettled([
          window.importer.get(`js/ListDisplayManager.js`).then(m => m.default),
          window.importer.get(`js/genshin/GenshinAccount.js`).then(m => m.default),
          window.importer.get(`js/genshin/MaterialList.js`).then(m => m.default),
          window.importer.get(`js/genshin/CharacterList.js`).then(m => m.default),
          window.importer.get(`js/genshin/WeaponList.js`).then(m => m.default),
          window.importer.get(`js/genshin/ArtifactList.js`).then(m => m.default),
          window.importer.get(`js/genshin/TeamList.js`).then(m => m.default),
          window.importer.get(`js/genshin/FurnitureList.js`).then(m => m.default),
          window.importer.get(`js/genshin/FurnitureSetList.js`).then(m => m.default)
        ]);
        
        // Extract successful loads and track failures
        const componentNames = ['ListDisplayManager', 'GenshinAccount', 'MaterialList', 'CharacterList', 
                               'WeaponList', 'ArtifactList', 'TeamList', 'FurnitureList', 'FurnitureSetList'];
        const failedComponents = [];
        const [
          ListDisplayManager, GenshinAccount, MaterialList, CharacterList, 
          WeaponList, ArtifactList, TeamList, FurnitureList, FurnitureSetList
        ] = loadResults.map((result, index) => {
          if (result.status === 'rejected') {
            failedComponents.push(componentNames[index]);
            console.error(`Failed to load ${componentNames[index]}:`, result.reason);
            return null;
          }
          return result.value;
        });
        
        // Store critical classes globally for access from other methods
        if (GenshinAccount) {
          window.GenshinAccount = GenshinAccount;
        } else {
          throw new Error('Critical class GenshinAccount failed to load - server may be down');
        }
        
        // Register lists (only those that loaded successfully)
        if (MaterialList) this.registerList(MaterialList);
        if (CharacterList) this.registerList(CharacterList);
        if (WeaponList) this.registerList(WeaponList);
        if (ArtifactList) this.registerList(ArtifactList);
        if (TeamList) this.registerList(TeamList);
        if (FurnitureList) this.registerList(FurnitureList);
        if (FurnitureSetList) this.registerList(FurnitureSetList);
        
        // Register navigation items (only for successfully loaded lists)
        this.registerNavItem("Daily Farming", "farming", {self:true});
        if (CharacterList) this.registerNavItem("Characters", "characters", {listName:"CharacterList", isDefault:true});
        if (WeaponList) this.registerNavItem("Weapons", "weapons", {listName:"WeaponList"});
        if (ArtifactList) this.registerNavItem("Artifacts", "artifacts", {listName:"ArtifactList"});
        if (TeamList) this.registerNavItem("Teams", "teams", {listName:"TeamList"});
        if (MaterialList) this.registerNavItem("Materials", "materials", {listName:"MaterialList"});
        if (FurnitureSetList) this.registerNavItem("Furniture Sets", "furnitureSets", {listName:"FurnitureSetList"});
        if (FurnitureList) this.registerNavItem("Furniture", "furniture", {listName:"FurnitureList"});
        
        // Report any failures to user
        if (failedComponents.length > 0) {
          console.warn(`Some components failed to load: ${failedComponents.join(', ')}. Those features will be unavailable.`);
          if (window.serverStatus) {
            window.serverStatus.showStatus(true, `Some features unavailable: ${failedComponents.join(', ')}`);
          }
        }
        
        this.minimalMode = false;
        this.initialized = true;
        
        console.log('Full initialization complete');
      } catch (error) {
        console.error('Failed to fully initialize GenshinManager:', error);
        
        // Show user-friendly error
        window.serverStatus?.showStatus(true, 'Game data failed to load completely. Some features may be unavailable.');
        
        // Create minimal navigation if possible
        try {
          this.registerNavItem("Daily Farming", "farming", {self:true});
        } catch (navError) {
          console.error('Failed to create basic navigation:', navError);
        }
        
        // Mark as initialized even if partial to prevent infinite retry
        this.initialized = true;
      }
    }
  }
  
  today()
  {
    let today = DateTime.now().setZone(GenshinManager.timezones[this.settings.preferences.server] ?? "UTC-9").weekdayLong;
    if(this.lastDay != today)
    {
      this.update("today", null, "notify");
    }
    this.lastDay = today;
    return today;
  }
  
  fromGOOD(goodData)
  {
    if(!goodData)
    {
      console.error(`No data provided to [object ${this.constructor.name}].fromGOOD(1)`);
      this.errors = true;
      return false;
    }
    if(goodData.format != "GOOD")
    {
      console.error(`Data provided to [object ${this.constructor.name}].fromGOOD(1) does not appear to be in GOOD format:`, goodData);
      this.errors = true;
      return false;
    }
    
    let hasData = false;
    if(goodData.materials)
    {
      try
      {
        hasData |= this.lists.MaterialList.fromGOOD(goodData.materials);
      }
      catch(x)
      {
        console.error("Error when loading materials from GOOD data.", x);
        this.errors = true;
      }
    }
    if(goodData.characters)
    {
      try
      {
        hasData |= this.lists.CharacterList.fromGOOD(goodData.characters);
      }
      catch(x)
      {
        console.error("Error when loading characters from GOOD data.", x);
        this.errors = true;
      }
    }
    if(goodData.weapons)
    {
      try
      {
        hasData |= this.lists.WeaponList.fromGOOD(goodData.weapons);
      }
      catch(x)
      {
        console.error("Error when loading weapons from GOOD data.", x);
        this.errors = true;
      }
    }
    if(goodData.artifacts)
    {
      try
      {
        hasData |= this.lists.ArtifactList.fromGOOD(goodData.artifacts);
        //this.lists.ArtifactList.evaluate(); // Re-add this somewhere so that it can be done sometime other than when the user manually clicks it.
      }
      catch(x)
      {
        console.error("Error when loading artifacts from GOOD data.", x);
        this.errors = true;
      }
    }
    if(goodData.teams)
    {
      try
      {
        hasData |= this.lists.TeamList.fromGOOD(goodData.teams);
      }
      catch(x)
      {
        console.error("Error when loading teams from GOOD data.", x);
        this.errors = true;
      }
    }
    if(goodData.furniture)
    {
      try
      {
        hasData |= this.lists.FurnitureList.fromGOOD(goodData.furniture);
      }
      catch(x)
      {
        console.error("Error when loading furniture from GOOD data.", x);
        this.errors = true;
      }
    }
    if(goodData.furnitureSets)
    {
      try
      {
        hasData |= this.lists.FurnitureSetList.fromGOOD(goodData.furnitureSets);
      }
      catch(x)
      {
        console.error("Error when loading furnitureSets from GOOD data.", x);
        this.errors = true;
      }
    }
    console.log("Loaded GOOD data.", {goodData});
    return hasData;
  }
  
  toGOOD()
  {
    return {
      format: "GOOD",
      source: "Genshin Manager",
      version: 2,
      materials: this.lists.MaterialList.toGOOD(),
      characters: this.lists.CharacterList.toGOOD(),
      weapons: this.lists.WeaponList.toGOOD(),
      artifacts: this.lists.ArtifactList.toGOOD(),
    };
  }
  
  async saveToPastebin()
  {
    let response = await fetch("https://themellin.com/genshin/saveToPastebin.php", {
      method: "POST",
      headers: {
        'Content-Type': "application/json",
      },
      body: JSON.stringify(this.toGOOD()),
    });
    let json = await response.json();
    if(json.success)
    {
      return json.code;
    }
    else
    {
      console.warn("Error when trying to save to Pastebin:", json);
      return false;
    }
  }
  
  createAccount(id)
  {
    const GenshinAccountClass = window.GenshinAccount;
    if (typeof GenshinAccountClass === 'undefined') {
      console.error('GenshinAccount class not loaded, cannot create account');
      throw new Error('Required game classes not loaded. Please refresh the page.');
    }
    return new GenshinAccountClass(id, {viewer:this});
  }
  
  activateAccount(account, server)
  {
    if(server)
      account = account + "@" + server;
    this.today();
    return super.activateAccount(account);
  }
  
  switchAccount(account, server)
  {
    if(server)
      account = account + "@" + server;
    this.activateAccount(account);
    //this.lists[CharacterList.name].initialize();
    this.view({pane:this.currentView});
    console.log(`Switching to account '${this.settings.server}'.`);
    return true;
  }
  
  postLoad(data, options)
  {
    if("account" in options || "server" in options)
    {
      if("account" in options && "server" in options)
        this.activateAccount(options.account +"@"+ options.server);
      else if("account" in options)
        this.activateAccount(options.account);
      else if("server" in options)
        this.activateAccount(options.server);
      if(!this.fromGOOD(data))
      {
        this.elements.loadError.classList.remove("d-none");
        this.elements.loadError.innerHTML = "Your input did not contain valid GOOD data.";
        return false;
      }
    }
    else
    {
      if(!this.fromJSON(data))
      {
        this.elements.loadError.classList.remove("d-none");
        this.elements.loadError.innerHTML = "Your input did not contain valid Genshin Manager data.";
        return false;
      }
    }
    return super.postLoad(data, options);
  }
  
  fromJSON(data, {merge=false}={})
  {
    let hasData = false;
    if(data.__class__ != this.constructor.name)
    {
      return hasData;
    }
    
    // Load farming planner data
    if(data.farmingPlanner)
    {
      hasData = true;
      if(data.farmingPlanner.priorities)
        this.farmingPlanner.priorities = data.farmingPlanner.priorities;
      if(data.farmingPlanner.doubleEvents)
        this.farmingPlanner.doubleEvents = data.farmingPlanner.doubleEvents;
    }
    
    // Load character build preferences.
    if(data.buildData)
    {
      hasData = true;
      if(!merge)
        this.buildData = {};
      for(let c in data.buildData)
      {
        if(!this.buildData[c])
          this.buildData[c] = [];
        Object.values(data.buildData[c]).forEach(newBuild => {
          let overwriteBuild = this.buildData[c].find(oldBuild => oldBuild.name == newBuild.name);
          if(overwriteBuild)
          {
            // check if it's literally the same build, or different with the same name
            newBuild.name = newBuild.name + " (new)";
          }
          this.buildData[c].push(newBuild);
        });
      }
      console.log("Loaded build data from file.", this.buildData);
    }
    
    this.today();
    
    return super.fromJSON(data, {merge}) || hasData;
  }
  
  async render(force=false)
  {
    // Handle farming planner rendering
    if(this.currentView === this.constructor.name)
    {
      const summary = this.farmingPlanner.getFarmingSummary();
      let render = await Renderer.rerender(
        this.elements[this.constructor.name].querySelector(`[data-uuid="${this.farmingPlanner.uuid}"]`),
        { item: this.farmingPlanner, summary: summary },
        {
          template: this.farmingPlanner.constructor.templateName,
          parentElement: this.elements[this.constructor.name],
        }
      );
      
      // Add event listeners for the farming planner
      this.addFarmingPlannerEventListeners();
      
      let footer = document.getElementById("footer");
      footer.classList.add("d-none");
      
      return {render, footer};
    }
    
    return super.render(force);
  }
  
  async renderContent(page)
  {
    if (page === 'farming') {
      return this.renderFarmingPlanner();
    }
    
    // For other pages, ensure full initialization
    if (this.minimalMode) {
      await this.ensureFullInitialization();
    }
    
    return super.renderContent(page);
  }
  
  addFarmingPlannerEventListeners()
  {
    // Double event toggles
    const doubleEventToggles = document.querySelectorAll('.double-event-toggle');
    doubleEventToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const eventType = e.target.dataset.event;
        this.farmingPlanner.setDoubleEvent(eventType, e.target.checked);
        this.render(true); // Re-render to update the display
      });
    });
    
    // Quick add buttons
    const quickAddButtons = document.querySelectorAll('.quick-add');
    quickAddButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const materialKey = e.target.dataset.material;
        const amount = parseInt(e.target.dataset.amount);
        this.farmingPlanner.incrementMaterial(materialKey, amount);
        this.render(true); // Re-render to update counts
      });
    });
    
    // Priority settings buttons
    const setPriorityButtons = document.querySelectorAll('#setPrioritiesBtn, #setPrioritiesBtn2');
    setPriorityButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.showPrioritySettingsModal();
      });
    });
  }
  
  async showPrioritySettingsModal()
  {
    try {
      const characters = this.lists.CharacterList.items();
      const weapons = this.lists.WeaponList.items();
      
      // Ensure farmingPlanner priorities exist
      if (!this.farmingPlanner.priorities) {
        this.farmingPlanner.priorities = {
          characters: {},
          weapons: {}
        };
      }
      
      await Renderer.rerender(
        this.elements.popup.querySelector(".modal-content"),
        { 
          characters: characters,
          weapons: weapons,
          priorities: this.farmingPlanner.priorities
        },
        {
          template: "genshin/renderPrioritySettingsModal",
          showPopup: true
        }
      );
      
      // Add event listeners for the modal
      this.addPriorityModalEventListeners();
    } catch (error) {
      console.error('Error showing priority settings modal:', error);
      // Show a simple fallback modal
      this.elements.popup.querySelector(".modal-content").innerHTML = `
        <div class="modal-header">
          <h5 class="modal-title">Priority Settings</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-warning">
            Priority settings are temporarily unavailable. Please try again later.
          </div>
        </div>
      `;
    }
  }
  
  addPriorityModalEventListeners()
  {
    try {
      // Priority sliders
      const prioritySliders = document.querySelectorAll('.priority-slider');
      prioritySliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
          try {
            const type = e.target.dataset.type;
            const key = e.target.dataset.key;
            const value = parseInt(e.target.value);
            
            // Update the display value
            const valueElement = e.target.parentElement.querySelector('.priority-value');
            if(valueElement) valueElement.textContent = value;
            
            // Update the priority
            if(type === 'character') {
              this.farmingPlanner.setCharacterPriority(key, value);
            } else if(type === 'weapon') {
              this.farmingPlanner.setWeaponPriority(key, value);
            }
          } catch (error) {
            console.error('Error updating priority:', error);
          }
        });
      });
      
      // Bulk priority buttons
      const bulkButtons = document.querySelectorAll('.bulk-priority');
      bulkButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          try {
            const value = parseInt(e.target.dataset.value);
            
            // Update all sliders and priorities
            const currentSliders = document.querySelectorAll('.priority-slider');
            currentSliders.forEach(slider => {
              slider.value = value;
              const valueElement = slider.parentElement.querySelector('.priority-value');
              if(valueElement) valueElement.textContent = value;
              
              const type = slider.dataset.type;
              const key = slider.dataset.key;
              
              if(type === 'character') {
                this.farmingPlanner.setCharacterPriority(key, value);
              } else if(type === 'weapon') {
                this.farmingPlanner.setWeaponPriority(key, value);
              }
            });
          } catch (error) {
            console.error('Error setting bulk priority:', error);
          }
        });
      });
    } catch (error) {
      console.error('Error setting up priority modal event listeners:', error);
    }
    
    // Save button (just closes modal since changes are saved automatically)
    try {
      const saveButton = document.querySelector('#savePriorities');
      if(saveButton) {
        saveButton.addEventListener('click', () => {
          bootstrap.Modal.getInstance(this.elements.popup).hide();
          this.render(true); // Re-render farming planner with new priorities
        });
      }
    } catch (error) {
      console.error('Error setting up save button:', error);
    }
  }
  
  store()
  {
    if(super.store())
      window.localStorage.setItem("genshinBuilds", JSON.stringify(this.buildData));
    this.today();
  }
  
  retrieve()
  {
    // Only retrieve if we have full initialization
    if (!this.minimalMode && this.initialized) {
      return super.retrieve();
    }
  }
  
  async initMinimal()
  {
    console.log('Initializing minimal GenshinManager (no data)');
    
    // Initialize only essential components
    try {
      // Basic setup without loading heavy data files
      this.elements['header'] = document.getElementById("viewerHeader");
      this.elements['main'] = document.getElementById("viewerMain");
      this.elements['popup'] = document.getElementById("viewerPopup");
      this.elements['nav'] = document.querySelector("#viewerHeader nav");
      
      // Initialize minimal lists (empty state)
      await this.initMinimalLists();
      
      // Setup basic navigation
      this.renderNav();
      
      // Render empty state
      await this.renderEmptyState();
      
      console.log('Minimal GenshinManager initialized successfully');
    } catch (error) {
      console.error('Error during minimal initialization:', error);
      // Fallback to basic empty state
      this.elements['main'].innerHTML = `
        <div class="container mt-4">
          <div class="alert alert-info">
            <h4>Welcome to Genshin Impact Progression Manager</h4>
            <p>To get started, import your data using the "Import" button in the menu.</p>
          </div>
        </div>
      `;
    }
  }

  async load(jsonString, options = {})
  {
    // Ensure full initialization before loading data
    await this.ensureFullInitialization();
    
    // Call parent load method
    return super.load(jsonString, options);
  }

  async renderEmptyState()
  {
    this.elements['main'].innerHTML = `
      <div class="container mt-4">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div class="card glass-morphism">
              <div class="card-body text-center p-5">
                <h2 class="text-hero mb-4">🎮 Genshin Impact Manager</h2>
                <p class="lead mb-4">Your ultimate companion for tracking characters, weapons, artifacts, and farming schedules.</p>
                
                <div class="row g-4 mb-5">
                  <div class="col-md-6">
                    <div class="card h-100">
                      <div class="card-body">
                        <i class="fa-solid fa-users fa-3x text-primary mb-3"></i>
                        <h5>Character Progression</h5>
                        <p class="text-muted">Track levels, ascensions, and talent upgrades</p>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="card h-100">
                      <div class="card-body">
                        <i class="fa-solid fa-calendar-day fa-3x text-success mb-3"></i>
                        <h5>Daily Farming Planner</h5>
                        <p class="text-muted">Optimize your resin usage with priority-based recommendations</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="d-flex gap-3 justify-content-center">
                  <button class="btn btn-primary btn-lg" data-bs-toggle="modal" data-bs-target="#loadModal">
                    <i class="fa-solid fa-upload me-2"></i>Import Data
                  </button>
                  <button class="btn btn-outline-secondary btn-lg" onclick="location.href='showcase.html'">
                    <i class="fa-solid fa-eye me-2"></i>View Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async renderFarmingPlanner()
  {
    try {
      if (!this.farmingPlanner) {
        this.farmingPlanner = new FarmingPlanner(this);
      }
      
      const summary = this.farmingPlanner.getFarmingSummary();
      
      await Renderer.rerender(
        this.elements.main,
        summary,
        {
          template: "genshin/renderFarmingPlanner",
          showPopup: false
        }
      );
      
      // Add event listeners
      this.addFarmingPlannerEventListeners();
    } catch (error) {
      console.error('Error rendering farming planner:', error);
      // Fallback content
      this.elements.main.innerHTML = `
        <div class="container mt-4">
          <div class="alert alert-warning">
            <h4>Farming Planner</h4>
            <p>Import your data to access the farming planner features.</p>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#loadModal">
              Import Data
            </button>
          </div>
        </div>
      `;
    }
  }
}