import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.3.0/+esm';
const { Renderer } = await window.importer.get(`js/Renderer.js`);

//import GenshinBuilds from "./gamedata/GenshinBuilds.js";
console.debug(`Importing other files.`);

const {default:DataManager} = await window.importer.get(`js/DataManager.js`);
console.debug(`Imported DataManager.`);
const {default:ListDisplayManager} = await window.importer.get(`js/ListDisplayManager.js`);
console.debug(`Imported ListDisplayManager.`);
const {default:GenshinAccount} = await window.importer.get(`js/genshin/GenshinAccount.js`);
console.debug(`Imported GenshinAccount.`);
const {default:MaterialList} = await window.importer.get(`js/genshin/MaterialList.js`);
console.debug(`Imported MaterialList.`);
const {default:CharacterList} = await window.importer.get(`js/genshin/CharacterList.js`);
console.debug(`Imported CharacterList.`);
const {default:WeaponList} = await window.importer.get(`js/genshin/WeaponList.js`);
console.debug(`Imported WeaponList.`);
const {default:ArtifactList} = await window.importer.get(`js/genshin/ArtifactList.js`);
console.debug(`Imported ArtifactList.`);
const {default:TeamList} = await window.importer.get(`js/genshin/TeamList.js`);
console.debug(`Imported TeamList.`);
const {default:FurnitureList} = await window.importer.get(`js/genshin/FurnitureList.js`);
console.debug(`Imported FurnitureList.`);
const {default:FurnitureSetList} = await window.importer.get(`js/genshin/FurnitureSetList.js`);
console.debug(`Imported FurnitureSetList.`);
const {default:FarmingPlanner} = await window.importer.get(`js/genshin/FarmingPlanner.js`);
console.debug(`Imported FarmingPlanner.`);

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
    
    // Initialize farming planner
    this.farmingPlanner = new FarmingPlanner(this);
    
    this.registerList(MaterialList);
    this.registerList(CharacterList);
    this.registerList(WeaponList);
    this.registerList(ArtifactList);
    this.registerList(TeamList);
    this.registerList(FurnitureList);
    this.registerList(FurnitureSetList);
    
    this.registerNavItem("Daily Farming", "farming", {self:true});
    this.registerNavItem("Characters", "characters", {listName:"CharacterList", isDefault:true});
    this.registerNavItem("Weapons", "weapons", {listName:"WeaponList"});
    this.registerNavItem("Artifacts", "artifacts", {listName:"ArtifactList"});
    this.registerNavItem("Teams", "teams", {listName:"TeamList"});
    this.registerNavItem("Materials", "materials", {listName:"MaterialList"});
    this.registerNavItem("Furniture Sets", "furnitureSets", {listName:"FurnitureSetList"});
    this.registerNavItem("Furniture", "furniture", {listName:"FurnitureList"});
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
    return new GenshinAccount(id, {viewer:this});
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
    const characters = this.lists.CharacterList.items();
    const weapons = this.lists.WeaponList.items();
    
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
  }
  
  addPriorityModalEventListeners()
  {
    // Priority sliders
    const prioritySliders = document.querySelectorAll('.priority-slider');
    prioritySliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
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
      });
    });
    
    // Bulk priority buttons
    const bulkButtons = document.querySelectorAll('.bulk-priority');
    bulkButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const value = parseInt(e.target.dataset.value);
        
        // Update all sliders and priorities
        prioritySliders.forEach(slider => {
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
      });
    });
    
    // Save button (just closes modal since changes are saved automatically)
    const saveButton = document.querySelector('#savePriorities');
    if(saveButton) {
      saveButton.addEventListener('click', () => {
        bootstrap.Modal.getInstance(this.elements.popup).hide();
        this.render(true); // Re-render farming planner with new priorities
      });
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
    // Load character build preferences.
    try
    {
      let builds = JSON.parse(window.localStorage.getItem("genshinBuilds") ?? "{}") ?? {};
      for(let c in builds)
      {
        if(!this.buildData[c])
          this.buildData[c] = [];
        Object.values(builds[c]).forEach(newBuild => {
          let overwriteBuild = this.buildData[c].find(oldBuild => oldBuild.name == newBuild.name);
          if(overwriteBuild)
          {
            // check if it's literally the same build, or different with the same name
            newBuild.name = newBuild.name + " (new)";
          }
          this.buildData[c].push(newBuild);
        });
      }
    }
    catch(x)
    {
      console.warn("Could not load local build data.", x);
      this.errors = true;
    }
    
    // Load the user data from the old way it's stored.
    let retrievedData;
    try
    {
      retrievedData = JSON.parse(window.localStorage.getItem("genshinAccount") ?? "null");
      if(retrievedData)
      {
        for(let acc in retrievedData)
        {
          for(let srv in retrievedData[acc])
          {
            let realAcc = acc+"@"+srv;
            if(!this.accounts[realAcc])
              this.accounts[realAcc] = this.createAccount(realAcc);
            this.accounts[realAcc].loadData(retrievedData[acc][srv]);
            this.errors = this.errors || this.accounts[realAcc].errors;
          }
        }
        console.log("Loaded account data from local storage (old method). This should be converted ot the new method automatically.", {retrievedData, storedData:this.accounts});
      }
      else
      {
        console.log("No account data to load via the old method (this is good).");
      }
    }
    catch(x)
    {
      console.error("Could not load stored local account data (old method).", x);
      this.errors = true;
    }
    
    return super.retrieve();
  }
}