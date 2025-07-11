const { Renderer } = await window.importer.get(`js/Renderer.js`);
const {default:Account} = await window.importer.get(`js/Account.js`);
const {default:UIController} = await window.importer.get(`js/UIController.js`);

export default class DataManager extends UIController
{
  static Renderer = Renderer; // Only here so the browser console can access it.
  static dontSerialize = super.dontSerialize.concat(["listClasses","navigation","elements","stickyElements","errors","storeTimeout","_cachedJSON","_lastSerialized","_serializationHash"]);
  
  dataVersion = 2;
  currentView;
  settings = {};
  settingDefs = {};
  accounts = {};
  
  listClasses = {};
  navigation = {};
  elements = {};
  stickyElements = [];
  errors;
  storeTimeout;
  
  constructor()
  {
    super();
    this.elements['nav'] = document.getElementById("navigation");
    if (!this.elements['nav']) {
      console.error("Navigation element not found, creating fallback");
      this.elements['nav'] = document.createElement("ul");
      this.elements['nav'].id = "navigation";
      this.elements['nav'].className = "navbar-nav me-auto mb-2 mb-lg-0";
    }
    this.elements['nav'].replaceChildren();
    this.elements['content'] = document.getElementById("content");
    this.elements['popup'] = document.getElementById("popup");
    this.elements['popup'].addEventListener('hidden.bs.modal', event => UIController.clearDependencies(event.target, true));
    this.settings.paneMemory = {};
    this.settings.preferences = {};
    this.settings.server = "";
  }
  
  registerList(listClass, {listName}={})
  {
    this.listClasses[listName ?? listClass.name] = listClass;
  }
  
  registerNavItem(label, hash, {self, listName, isDefault}={})
  {
    let tempNav = Object.values(this.navigation);
    if(self)
    {
      this.elements[this.constructor.name] = document.getElementById(this.constructor.name) ?? this.elements.content.appendChild(document.createElement("div"));
      this.elements[this.constructor.name].id = this.constructor.name;
      this.elements[this.constructor.name].classList.add("viewer-pane");
      this.settings.paneMemory[this.constructor.name] = this.settings.paneMemory[this.constructor.name] ?? {};
      if(this.navigation[`#${hash}`])
        console.warn(`#${hash} is already used as a navigation link, overwriting this data:`, this.navigation[`#${hash}`]);
      this.navigation[`#${hash}`] = {type:"controller", pane:this.constructor.name};
    }
    else if(listName)
    {
      this.elements[listName] = document.getElementById(listName) ?? this.elements.content.appendChild(document.createElement("div"));
      this.elements[listName].id = listName;
      this.elements[listName].classList.add("viewer-pane");
      this.settings.paneMemory[listName] = this.settings.paneMemory[listName] ?? {};
      if(this.navigation[`#${hash}`])
        console.warn(`#${hash} is already used as a navigation link, overwriting this data:`, this.navigation[`#${hash}`]);
      this.navigation[`#${hash}`] = {type:"list", pane:listName};
    }
    else
    {
      console.error(`Navigation link (${label}, ${hash}) must specify listName.`);
      return false;
    }
    if(isDefault)
    {
      if(this.navigation[''])
        console.warn(`Default navigation link is already set, overwriting this data:`, this.navigation['']);
      this.navigation[''] = this.navigation[`#${hash}`];
    }
    if (!this.elements['nav']) {
      console.error(`Cannot register navigation item ${hash} - navigation container missing`);
      return;
    }
    
    this.navigation[`#${hash}`].element = this.elements['nav'].insertBefore(document.createElement("li"), tempNav.length ? tempNav[tempNav.length-1].element.nextSibling : this.elements['nav'].firstChild);
    this.navigation[`#${hash}`].element.classList.add("nav-item");
    let link = this.navigation[`#${hash}`].element.appendChild(document.createElement("a"));
    link.classList.add("nav-link");
    link.classList.add("pane-select");
    link.href = `#${hash}`;
    link.innerHTML = label;
  }
  
  get lists()
  {
    return this.accounts?.[this.settings.server]?.lists ?? {};
  }
  
  get account()
  {
    return this.accounts?.[this.settings.server];
  }
  
  createAccount(id)
  {
    return new Account(id, {viewer:this});
  }
  
  activateAccount(account)
  {
    let changed = false;
    if(this.settings.server != account)
      changed = true;
    this.settings.server = account;
    if(!this.accounts)
      this.accounts = {};
    if(!this.accounts[this.settings.server])
      this.accounts[this.settings.server] = this.createAccount(this.settings.server);
    this.accounts[this.settings.server].loadData();
    if(changed)
      for(let listName in this.listClasses)
        this.lists[listName].forceNextRender = true;
    this.queueStore();
    return true;
  }
  
  switchAccount(account)
  {
    this.activateAccount(account);
    this.view({pane:this.currentView});
    console.log(`Switching to account '${this.settings.server}'.`);
    return true;
  }
  
  getSettings(global=false)
  {
    if(global)
      return Object.values(this.settingDefs);
    else
      return Object.values(this.account.settingDefs);
  }
  
  get controllerMap()
  {
    return Renderer.controllers;
  }
  
  paneFromHash(hash)
  {
    if(this.navigation[hash ?? location.hash])
      return this.navigation[hash ?? location.hash].pane;
    else if(this.navigation[''])
      return this.navigation[''].pane;
    else
    {
      console.error(`Navigation has not been set up.`);
      return "";
    }
  }
  
  async view({hash,pane}={})
  {
    pane = pane ?? this.paneFromHash(hash);
    if(this.lists[pane])
    {
      await this.lists[pane].render();
    }
    else if(pane == this.constructor.name)
    {
      await this.render();
    }
    else
    {
      console.error(`Unknown pane`, {hash, pane});
      return false;
    }
    this.stickyElements = document.querySelectorAll(".sticky-js");
    window.scrollTo({left:0, top:this.settings.paneMemory[pane]?.scrollY ?? 0, behavior:"instant"});
    this.currentView = pane;
    for(let hash in this.navigation)
    {
      if(this.navigation[hash].pane == pane)
        this.elements[this.navigation[hash].pane].classList.add("current-view");
      else
        this.elements[this.navigation[hash].pane].classList.remove("current-view");
    }
  }
  
  async render(force=false)
  {
    let render = await Renderer.rerender(
      this.elements[this.constructor.name].querySelector(`[data-uuid="${this.uuid}"]`),
      { item: this },
      {
        template: this.constructor.templateName,
        parentElement: this.elements[this.constructor.name],
      }
    );
    
    let footer = document.getElementById("footer");
    footer.classList.add("d-none");
    
    return {render, footer};
  }
  
  onScroll(event)
  {
    for(let element of this.stickyElements)
    {
      element.style.top = window.scrollY+"px";
    }
  }
  
  saveScrollX(px)
  {
    if(this.settings.paneMemory[this.currentView])
      this.settings.paneMemory[this.currentView].scrollX = px;
    //console.log(this.settings.paneMemory[this.currentView].scrollX, this.settings.paneMemory[this.currentView].scrollY);
  }
  
  saveScrollY(px)
  {
    if(this.settings.paneMemory[this.currentView])
      this.settings.paneMemory[this.currentView].scrollY = px;
    //console.log(this.settings.paneMemory[this.currentView].scrollX, this.settings.paneMemory[this.currentView].scrollY);
  }
  
  load(data, options={})
  {
    // Check for valid JSON.
    if(typeof(data) != "object")
    {
      try
      {
        data = JSON.parse(data);
        console.log(`Loaded JSON data.`, {data});
      }
      catch
      {
        this.elements.loadError.classList.remove("d-none");
        this.elements.loadError.innerHTML = "Your input did not contain valid JSON.";
        this.errors = true;
        return false;
      }
    }
    return this.postLoad(data, options);
  }
  
  postLoad(data, options)
  {
    this.queueStore();
    bootstrap.Modal.getOrCreateInstance(this.elements.loadModal).hide();
    this.elements.loadError.classList.add("d-none");
    this.view({pane:this.currentView});
    return true;
  }
  
  fromJSON(fileData, {merge=false}={})
  {
    let hasData = false;
    if(fileData.__class__ != this.constructor.name)
    {
      if("__class__" in fileData)
        console.error(`Invalid class "${fileData.__class__}" specified in data. Class must be "${this.constructor.name}".`, {fileData});
      return hasData;
    }
    
    console.log("Importing account data from file.", {fileData});
    hasData = hasData || this.importData({data:fileData.accounts, merge, settings:fileData.settings});
    
    // Determine the account to activate.
    if(!this.accounts?.[this.settings.server])
      this.settings.server = Object.keys(this.accounts ?? {})[0] ?? "";
    this.activateAccount(this.settings.server)
    
    return hasData;
  }
  
  queueStore()
  {
    if(this.storeTimeout)
      clearTimeout(this.storeTimeout);
    this.storeTimeout = setTimeout(() => {
      this.store();
    }, 200);
  }
  
  store()
  {
    if(!this.accounts?.[this.settings.server])
      this.settings.server = Object.keys(this.accounts ?? {})[0] ?? "";
    if(!this.accounts)
      this.accounts = {};
    
    /*let serversArray = [];
    for(let server in this.accounts)
    {
      let listsArray = [];
      for(let list in this.accounts[server])
      {
        try
        {
          listsArray.push(`"${list}":` + JSON.stringify(this.accounts[server][list]));
        }
        catch(exception)
        {
          console.error(`Exception when serializing`, {server, list, exception});
          this.errors = true;
        }
      }
      serversArray.push(`"${server}":{${listsArray.join(',')}}`);
    }*/
    
    if(this.errors)
    {
      console.warn(`Corruption detected in your progression data. Save aborted in order to prevent your saved data from being corrupted too. You must reload the page to clear this. If the problem persist, you may have to report a bug to the developer here: https://github.com/kree-nickm/progression-manager/issues`, `If you are willing to risk your data and ignore this error, you can type "viewer.errors = false" into the console, then make any change to your data to attempt saving again.`);
      return false;
    }
    
    try {
      // Use optimized serialization to reduce memory usage
      const optimizedData = JSON.stringify(this);
      
      // Check if the data is too large for localStorage (typically 5-10MB limit)
      const dataSize = new Blob([optimizedData]).size;
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      
      if (dataSize > maxSize) {
        console.warn(`Data size (${(dataSize / 1024 / 1024).toFixed(2)}MB) exceeds localStorage limit. Attempting compact storage...`);
        
        // Try to store only essential data
        const essentialData = {
          __class__: this.constructor.name,
          dataVersion: this.dataVersion,
          settings: this.settings,
          accounts: this.accounts
        };
        
        const compactData = JSON.stringify(essentialData);
        const compactSize = new Blob([compactData]).size;
        
        if (compactSize > maxSize) {
          console.error(`Even compact data (${(compactSize / 1024 / 1024).toFixed(2)}MB) is too large for localStorage. Save failed.`);
          return false;
        }
        
        window.localStorage.setItem(`${this.constructor.name}`, compactData);
        console.log(`Compact local data saved (${(compactSize / 1024 / 1024).toFixed(2)}MB).`);
      } else {
        window.localStorage.setItem(`${this.constructor.name}`, optimizedData);
        console.log(`Local data saved (${(dataSize / 1024 / 1024).toFixed(2)}MB).`);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }
  
  retrieve()
  {
    console.log("Importing account data from local storage.");
    
    // Load entire manager if possible.
    let json = window.localStorage.getItem(`${this.constructor.name}`);
    if(json)
    {
      this.fromJSON(JSON.parse(json));
    }
    else
    {
      // Load stored accounts for the game.
      let data;
      try
      {
        data = JSON.parse(window.localStorage.getItem(`${this.constructor.name}Data`) ?? "null");
      }
      catch(x)
      {
        console.error("Could not load stored local account data.", x);
        this.errors = true;
      }
      
      // Load stored, game-specific settings.
      let settings;
      try
      {
        settings = JSON.parse(window.localStorage.getItem(`${this.constructor.name}Settings`) ?? "null");
      }
      catch(x)
      {
        console.error("Could not load stored settings.", x);
        this.errors = true;
      }
      
      // Import the data loaded above.
      this.importData({data, settings});
    
      // Determine the account to activate.
      if(!this.accounts?.[this.settings.server])
        this.settings.server = Object.keys(this.accounts ?? {})[0] ?? "";
      this.activateAccount(this.settings.server)
    }
    
    // Load the page indicated by the settings, if any.
    if(this.currentView)
      this.view({pane:this.currentView});
  }
  
  importData({data, merge, settings}) // note: merge currently does nothing
  {
    let hasData = false;
    
    if(data)
    {
      hasData = true;
      for(let acc in data)
      {
        if(!this.accounts[acc])
          this.accounts[acc] = this.createAccount(acc);
        this.accounts[acc].loadData(data[acc]);
        this.errors = this.errors || this.accounts[acc].errors;
      }
      console.log("Imported account data.", {importedAccounts:data, currentAccounts:this.accounts});
    }
    else
    {
      console.log("No account data to import.");
    }
    
    if(settings)
    {
      hasData = true;
      for(let s in settings)
        this.settings[s] = settings[s];
      console.log("Imported settings.", {importedSettings:settings, currentSettings:this.settings});
    }
    else
    {
      console.log("No settings to import.");
    }
    
    return hasData;
  }
}