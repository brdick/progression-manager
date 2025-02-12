const { handlebars, Renderer } = await window.importer.get(`js/Renderer.js`);

// Add some utility functions that will simplify other parts of the code.
String.prototype.capitalize = function() { return this.at(0).toUpperCase()+this.substr(1).toLowerCase(); };

window.stringInstanceOf = function(object, className) {
  while(object?.constructor)
  {
    if(object.constructor.name == className)
      return true;
    else
      object = object.__proto__;
  }
  return false;
};

Math.pround = function(value, maxDecimals) {
  return parseFloat(parseFloat(value).toFixed(parseInt(maxDecimals)));
};

// Add some features that we can use for debugging purposes.
window.DEBUGLOG = {
  queueUpdate: false,
  renderItemField: false,
  addFieldEventListeners: false,
  getRelatedItems: false,
  contentToHTML: false,
  sortItems: false,
  StatModifier_create: false,
  
  enableAll: () => { for(let method in window.DEBUGLOG) window.DEBUGLOG[method] = true; },
};

if(!window.importer.productionMode)
{
  window.DEBUG = {
    called: function(func, object, args)
    {
      if(!window.DEBUG.began)
        return;
      console.log({func, object, args});
      window.DEBUG.lastOp.trace.push({func, object, args});
      let key = object.constructor.name != "Function" ? `[object ${object.constructor.name}].${func.name}` : `${object.name}.${func.name}`;
      if(!window.DEBUG.lastOp.tally[key])
        window.DEBUG.lastOp.tally[key] = 1;
      else
        window.DEBUG.lastOp.tally[key]++;
    },
    begin: function()
    {
      window.DEBUG.began = true;
      window.DEBUG.lastOp.trace = [];
      window.DEBUG.lastOp.tally = {};
    },
    lastOp: {trace:[], tally:{}},
    began: false,
    log: function(...args)
    {
      console.debug(...args);
    },
  };
}

// Load site-wide settings.
window.generalSettings = JSON.parse(window.localStorage.getItem("generalSettings") ?? "{}") ?? {};

let darkModeToggle = document.getElementById("darkModeToggle");
darkModeToggle?.addEventListener("change", event => {
  let link = document.getElementById("lightDark");
  if(event.target.checked)
  {
    link.href = "css/dark.css";
    document.body.classList.add("dark-mode");
    window.generalSettings.darkMode = true;
    window.localStorage.setItem("generalSettings", JSON.stringify(window.generalSettings));
  }
  else
  {
    link.href = "css/light.css";
    document.body.classList.remove("dark-mode");
    window.generalSettings.darkMode = false;
    window.localStorage.setItem("generalSettings", JSON.stringify(window.generalSettings));
  }
});
if(window.generalSettings.darkMode)
{
  if(darkModeToggle)
    darkModeToggle.checked = true;
  let link = document.getElementById("lightDark");
  link.href = "css/dark.css";
  document.body.classList.add("dark-mode");
}
  

// Initialize.
if(typeof(Storage) !== "undefined")
{
  console.log(`Web Storage enabled.`);
  let game;
  for(let selectBtn of document.querySelectorAll(".select-game"))
  {
    selectBtn.addEventListener("click", async (event) => {
      console.log(`Loading game '${selectBtn.dataset.game}'.`);
      window.generalSettings.game = selectBtn.dataset.game;
      window.localStorage.setItem("generalSettings", JSON.stringify(window.generalSettings));
      if(window.viewer)
      {
        console.log(`A manager is already loaded. Reloading the page into the new manager to conserve memory.`);
        location.reload();
      }
      else
      {
        document.getElementById("gameIcon").innerHTML = `<img src="img/gameIcons/${selectBtn.dataset.game}.webp"/>`;
        const { addEventListeners, init } = await window.importer.get(`js/${selectBtn.dataset.game}/load.js`);
        
        let modalsHTML = await window.importer.get(`templates/${selectBtn.dataset.game}/menuModals.html`);
        let modalsTemplate = handlebars.compile(modalsHTML);
        document.getElementById("menuModalContainer").innerHTML = modalsTemplate();
        
        let buttonsHTML = await window.importer.get(`templates/${selectBtn.dataset.game}/menuButtons.html`);
        let buttonsTemplate = handlebars.compile(buttonsHTML);
        document.getElementById("menuButtonContainer").innerHTML = buttonsTemplate();
        
        let css = document.head.appendChild(document.createElement("link"));
        css.type = "text/css";
        css.rel = "stylesheet";
        css.href = `css/${selectBtn.dataset.game}.css`;
        document.title = `${selectBtn.dataset.game.at(0).toUpperCase()+selectBtn.dataset.game.slice(1)} Manager`;
        
        await baseAddEventListeners();
        await addEventListeners();
        await init();
        await loadPage();
      }
    });
    if(window.generalSettings.game == selectBtn.dataset.game)
    {
      game = selectBtn.dataset.game;
      setTimeout(()=>selectBtn.dispatchEvent(new Event("click")), 1);
    }
  }
  if(!game)
  {
    // Make user pick a game.
  }
}
else
{
  document.getElementById('content').innerHTML = "Your browser does not support Web Storage, and therefore we cannot save your data.";
  throw new Error("Your browser does not support Web Storage, and therefore we cannot save your data.");
}

async function baseAddEventListeners()
{
  // Track viewport scroll for tab changes.
  document.addEventListener("scroll", event => window.viewer.onScroll(event));
  document.addEventListener("scrollend", event => window.viewer.saveScrollY(window.scrollY));

  // Set up account editor.
  document.getElementById("editModal")?.addEventListener("show.bs.modal", showEvent => {
    let selectElem = document.getElementById("editAccount");
    selectElem.replaceChildren();
    selectElem.add((()=>{let e=document.createElement("option");e.value="";e.text="Create New...";return e;})());
    for(let acc in window.viewer.accounts)
      if(acc)
        selectElem.add((()=>{let e=document.createElement("option");e.value=acc;e.text=acc;return e;})());
    selectElem.selectedIndex = Array.from(selectElem.options).findIndex(elem => elem.value == window.viewer.settings.server);
    selectElem.dispatchEvent(new Event("change"));
  });

  document.getElementById("editAccount")?.addEventListener("change", changeEvent => {
    if(changeEvent.target.value)
      document.getElementById("editAccountNew").classList.add("d-none");
    else
      document.getElementById("editAccountNew").classList.remove("d-none");
    if(changeEvent.target.options.length > 1)
      changeEvent.target.classList.remove("d-none");
    else
      changeEvent.target.classList.add("d-none");
  });

  document.getElementById("editDoneBtn")?.addEventListener("click", clickEvent => {
    let selectedAccount = document.getElementById("editAccount").value;
    if(!selectedAccount)
      selectedAccount = document.getElementById("editAccountNew").value;
    if(selectedAccount)
    {
      if(window.viewer.switchAccount(selectedAccount))
      {
        bootstrap.Modal.getOrCreateInstance(document.getElementById("editModal")).hide();
        document.getElementById("editError").classList.add("d-none");
      }
    }
    else
    {
      document.getElementById("editError").innerHTML = "Account field cannot be blank.";
      document.getElementById("editError").classList.remove("d-none");
    }
  });

  // Setup prefs popup
  document.getElementById("prefsDoneBtn")?.addEventListener("click", clickEvent => {
    for(let prefElem of document.getElementsByClassName("preference-select"))
    {
      if(prefElem.type == "radio")
      {
        if(prefElem.checked)
          window.viewer.settings.preferences[prefElem.attributes.getNamedItem('name').value] = prefElem.value;
      }
      else if(prefElem.type == "checkbox")
      {
        window.viewer.settings.preferences[prefElem.attributes.getNamedItem('name').value] = prefElem.checked;
      }
      else
      {
        window.viewer.settings.preferences[prefElem.attributes.getNamedItem('name').value] = prefElem.value;
      }
    }
    for(let list in window.viewer.listClasses)
      if(window.viewer.lists[list])
      {
        window.viewer.lists[list].forceNextRender = true;
        window.viewer.lists[list].subsets = {};
      }
    window.viewer.view({pane:window.viewer.currentView});
    window.viewer.queueStore();
  });

  document.getElementById("prefsModal")?.addEventListener("show.bs.modal", async showEvent => {
    for(let pref in window.viewer.settings.preferences)
    {
      for(let prefElem of showEvent.target.querySelectorAll(`.preference-select[name="${pref}"]`))
      {
        if(prefElem.type == "radio" || prefElem.type == "checkbox")
        {
          if(prefElem.value == window.viewer.settings.preferences[pref])
            prefElem.checked = true;
          else
            prefElem.checked = false;
        }
        else if(prefElem.type == "number")
        {
          prefElem.value = window.viewer.settings.preferences[pref];
        }
      }
    }
    /*let container = showEvent.target.querySelector(".row:last-of-type");
    for(let setting of window.viewer.getSettings())
    {
      let template = (await Renderer.getTemplates("setting")).setting;
      let existing = document.getElementById(`setting_${setting.key}`);
      if(!existing)
      {
        let child = container.appendChild(document.createElement("div"));
        child.classList.add("col-6");
        child.innerHTML = template(setting);
      }
    }*/
  });

  // Setup "new user" popup.
  document.getElementById("newLoadBtn")?.addEventListener("click", event => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("newModal")).hide();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("loadModal")).show();
  });

  document.getElementById("newFreshBtn")?.addEventListener("click", event => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("newModal")).hide();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("editModal")).show();
  });
}

async function loadPage()
{
  // Set up nav.
  let toClick = 0;
  let navLinks = document.querySelectorAll(".pane-select");
  for(let i=0; i<navLinks.length; i++)
  {
    navLinks[i].addEventListener("click", event => {
      for(let k=0; k<navLinks.length; k++)
      {
        if(event.target == navLinks[k])
          navLinks[k].classList.add("active");
        else
          navLinks[k].classList.remove("active");
      }
      // Do a check to see if this is the user's first visit.
      if(window.viewer.settings.server)
        window.viewer.view({hash:navLinks[i].hash});
      else
        bootstrap.Modal.getOrCreateInstance(document.getElementById("newModal")).show();
    });
    if(navLinks[i].hash == location.hash)
      toClick = i;
  }
  setTimeout(()=>navLinks[toClick].dispatchEvent(new Event("click")), 1);
  
  // TODO: Back/forward browser buttons don't work.

  if(location.search.at(0) == "?")
  {
    let params = location.search.slice(1).split("&").reduce((result,param) => {
      let p = param.split("=");
      result[p[0]] = p[1] ?? true;
      return result;
    }, {});
    /*if(params.pb)
    {
      document.getElementById("loadPastebinCode").value = params.pb;
      document.getElementById("loadPastebinBtn").dispatchEvent(new Event("click"));
      bootstrap.Modal.getOrCreateInstance(document.getElementById("newModal")).hide();
      bootstrap.Modal.getOrCreateInstance(document.getElementById("loadModal")).show();
      //history.replaceState({}, "", location.pathname + location.hash);
    }*/
  }
}