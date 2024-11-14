async function addEventListeners()
{
  // Set up JSON loader.
  document.getElementById("loadModal")?.addEventListener("show.bs.modal", showEvent => {
    document.getElementById("loadGOODTab").dispatchEvent(new Event("click"));
    document.getElementById("loadHoyos").classList.add("d-none");
    document.getElementById("loadError").classList.add("d-none");
    
    let selectElem = document.getElementById("loadAccount");
    selectElem.replaceChildren();
    selectElem.add((()=>{let e=document.createElement("option");e.value="";e.text="Create New...";return e;})());
    for(let acc in window.viewer.accounts)
      if(acc)
        selectElem.add((()=>{let e=document.createElement("option");e.value=acc;e.text=acc;return e;})());
    selectElem.selectedIndex = Array.from(selectElem.options).findIndex(elem => elem.value == window.viewer.settings.server);
    selectElem.dispatchEvent(new Event("change"));
  });

  document.getElementById("loadAccount")?.addEventListener("change", changeEvent => {
    if(changeEvent.target.value)
    {
      document.getElementById("loadAccountNew").classList.add("d-none");
      document.getElementById("loadAccountNote").classList.remove("d-none");
    }
    else
    {
      document.getElementById("loadAccountNew").classList.remove("d-none");
      document.getElementById("loadAccountNote").classList.add("d-none");
    }
    if(changeEvent.target.options.length > 1)
      changeEvent.target.classList.remove("d-none");
    else
      changeEvent.target.classList.add("d-none");
  });

  document.getElementById("loadGOODFile")?.addEventListener("change", changeEvent => {
    document.getElementById("loadError").classList.add("d-none");
    let reader = new FileReader();
    // TODO: This doesn't seem to be working here even though it works in loadAllFile...
    let msg = document.getElementById("loadMessage");
    msg.classList.remove("d-none");
    msg.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin"></i> Importing...`;
    reader.addEventListener("load", async loadEvent => {
      let selectedAccount = document.getElementById("loadAccount").value;
      if(!selectedAccount)
        selectedAccount = document.getElementById("loadAccountNew").value;
      if(selectedAccount)
      {
        window.viewer.load(loadEvent.target.result, {account: selectedAccount});
        changeEvent.target.value = "";
      }
      else
      {
        document.getElementById("loadError").innerHTML = "Account field cannot be blank.";
        document.getElementById("loadError").classList.remove("d-none");
      }
      msg.classList.add("d-none");
    });
    reader.readAsText(changeEvent.target.files[0]);
  });

  document.getElementById("loadAllFile")?.addEventListener("change", changeEvent => {
    document.getElementById("loadError").classList.add("d-none");
    let reader = new FileReader();
    let msg = document.getElementById("loadMessage");
    msg.classList.remove("d-none");
    msg.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin"></i> Importing...`;
    reader.addEventListener("load", async loadEvent => {
      window.viewer.load(loadEvent.target.result);
      changeEvent.target.value = "";
      msg.classList.add("d-none");
    });
    reader.readAsText(changeEvent.target.files[0]);
  });

  document.getElementById("loadPastebinBtn")?.addEventListener("click", async clickEvent => {
    document.getElementById("loadError").classList.add("d-none");
    let input = document.getElementById("loadPastebinCode");
    if(input.value)
    {
      let msg = document.getElementById("loadMessage");
      msg.classList.remove("d-none");
      msg.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin"></i> Importing...`;
      let response = await fetch("https://corsproxy.io/?https://pastebin.com/raw/"+input.value, {
        method: "GET",
      });
      let json = await response.json();
      if(json.format == "GOOD")
      {
        let selectedAccount = document.getElementById("loadAccount").value;
        if(!selectedAccount)
          selectedAccount = document.getElementById("loadAccountNew").value;
        if(selectedAccount)
        {
          window.viewer.load(json, {account: selectedAccount});
          input.value = "";
        }
        else
        {
          document.getElementById("loadError").innerHTML = "Account field cannot be blank.";
          document.getElementById("loadError").classList.remove("d-none");
        }
      }
      else
      {
        document.getElementById("loadError").innerHTML = "Code does not match a Pastebin post with valid GOOD data.";
        document.getElementById("loadError").classList.remove("d-none");
        console.error(`Code does not match a Pastebin post with valid GOOD data.`, json);
      }
      msg.classList.add("d-none");
    }
    else
    {
      document.getElementById("loadError").innerHTML = "Pastebin code cannot be blank.";
      document.getElementById("loadError").classList.remove("d-none");
    }
  });

  document.getElementById("loadEnkaBtn")?.addEventListener("click", async clickEvent => {
    document.getElementById("loadError").classList.add("d-none");
    let selectedAccount = document.getElementById("loadAccount").value;
    if(!selectedAccount)
      selectedAccount = document.getElementById("loadAccountNew").value;
    if(!selectedAccount)
    {
      document.getElementById("loadError").innerHTML = "Account field cannot be blank.";
      document.getElementById("loadError").classList.remove("d-none");
      return;
    }
    
    let input = document.getElementById("loadEnka");
    if(!input.value)
    {
      document.getElementById("loadError").innerHTML = "Enka field cannot be blank.";
      document.getElementById("loadError").classList.remove("d-none");
      return;
    }
    
    let msg = document.getElementById("loadMessage");
    msg.classList.remove("d-none");
    msg.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin"></i> Importing...`;
    const {default:EnkaQuery} = await import(`./genshin/EnkaQuery.js?v=${window.versionId}`);
    let query = new EnkaQuery(input.value);
    let type = await query.request();
    if(type == "builds" || type == "showcase")
    {
      window.viewer.load({
        format: "GOOD",
        source: "Genshin Manager/EnkaQuery",
        version: 2,
        characters: query.characterData,
        artifacts: query.artifactData,
        weapons: query.weaponData,
      }, {account: selectedAccount});
      input.value = "";
    }
    else if(type == "hoyos")
    {
      let hoyosElement = document.getElementById("loadHoyos");
      hoyosElement.classList.remove("d-none");
      hoyosElement.replaceChildren();
      if(query.hoyos.length)
      {
        let hoyoCaption = hoyosElement.appendChild(document.createElement("b"));
        //hoyoCaption.classList.add("");
        hoyoCaption.innerHTML = `Select account from Enka (${input.value}):`;
        for(let hoyo of query.hoyos)
        {
          let hoyoElem = hoyosElement.appendChild(document.createElement("div"));
          hoyoElem.classList.add("row", "choose-hoyo");
          let hoyoRegion = hoyoElem.appendChild(document.createElement("div"));
          hoyoRegion.classList.add("col-1");
          hoyoRegion.innerHTML = hoyo.region ?? "";
          let hoyoUID = hoyoElem.appendChild(document.createElement("div"));
          hoyoUID.classList.add("col-3");
          hoyoUID.innerHTML = hoyo.uid ?? "UID hidden";
          let hoyoNick = hoyoElem.appendChild(document.createElement("div"));
          hoyoNick.classList.add("col-4");
          hoyoNick.innerHTML = hoyo.nickname ?? "Nickname hidden";
          let hoyoAR = hoyoElem.appendChild(document.createElement("div"));
          hoyoAR.classList.add("col-2");
          hoyoAR.innerHTML = "AR"+hoyo.ar;
          let hoyoWL = hoyoElem.appendChild(document.createElement("div"));
          hoyoWL.classList.add("col-2");
          hoyoWL.innerHTML = "WL"+hoyo.worldLevel;
          let hoyoSig = hoyoElem.appendChild(document.createElement("div"));
          hoyoSig.classList.add("col-12");
          hoyoSig.innerHTML = hoyo.signature;
          hoyoElem.addEventListener("click", async event => {
            let msg = document.getElementById("loadMessage");
            msg.classList.remove("d-none");
            msg.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin"></i> Importing...`;
            query.selectHoyo(hoyo.hash);
            let type = await query.request();
            if(type == "builds")
            {
              window.viewer.load({
                format: "GOOD",
                source: "Genshin Manager/EnkaQuery",
                version: 2,
                characters: query.characterData,
                artifacts: query.artifactData,
                weapons: query.weaponData,
              }, {account: selectedAccount});
              input.value = "";
            }
            msg.classList.add("d-none");
          });
        }
      }
      else
      {
        let hoyoCaption = hoyosElement.appendChild(document.createElement("b"));
        //hoyoCaption.classList.add("");
        hoyoCaption.innerHTML = `That username has no valid, public, Genshin Impact accounts listed on Enka.network.`;
      }
      input.value = "";
    }
    else
    {
      document.getElementById("loadError").innerHTML = "Failed to fetch data from Enka.network. Ensure that your characters are loaded into <a href='https://enka.network/' target='_blank'>Enka.network</a> when you search for your UID.";
      document.getElementById("loadError").classList.remove("d-none");
      console.error(`Failed to fetch data from Enka.network.`, {input:input.value});
    }
    msg.classList.add("d-none");
  });

  /*document.getElementById("loadGOODBtn")?.addEventListener("click", event => {
    document.getElementById("loadError").classList.add("d-none");
    let selectedAccount = document.getElementById("loadAccount").value;
    if(!selectedAccount)
      selectedAccount = document.getElementById("loadAccountNew").value;
    let textArea = document.getElementById("loadGOODJSON");
    window.viewer.load(textArea.value, {account: selectedAccount});
    textArea.value = "";
  });*/

  // Set up JSON saver.
  const saveTemplateAsFile = (filename, dataObjToWrite) => {
    const blob = new Blob([JSON.stringify(dataObjToWrite)], { type: "text/json" });
    const link = document.createElement("a");
    
    link.download = filename;
    link.href = window.URL.createObjectURL(blob);
    link.dataset.downloadurl = ["text/json", link.download, link.href].join(":");
    
    const evt = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    
    link.dispatchEvent(evt);
    link.remove()
  };

  document.getElementById("saveGOODBtn")?.addEventListener("click", event => {
    saveTemplateAsFile("GenshinData.GOOD.json", window.viewer.toGOOD());
  });

  document.getElementById("saveAllBtn")?.addEventListener("click", event => {
    saveTemplateAsFile("GenshinData.json", window.viewer);
  });

  document.getElementById("savePastebinBtn")?.addEventListener("click", async event => {
    event.target.disabled = true;
    setTimeout(() => event.target.disabled = false, 60000);
    let msg = document.getElementById("saveMessage");
    msg.classList.remove("d-none");
    msg.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin"></i> Uploading...`;
    let response = await window.viewer.saveToPastebin();
    if(response)
    {
      msg.innerHTML = `Saved to <a href="https://pastebin.com/${response}" target="_blank">Pastebin</a> successfully.<br/><b>Code: <tt>${response}</tt></b><br/>Data will be available for 1 week.`;
    }
    else
    {
      msg.innerHTML = `An error occured trying to upload data to Pastebin. Check the JavaScript console (F12) for more information.`;
    }
  });
}

async function init()
{
  console.log(`Initting GenshinManager`);
  const {default:GenshinManager} = await import(`./GenshinManager.js?v=${window.versionId}`);
  console.log(`Loading GenshinManager`, GenshinManager);
  window.viewer = new GenshinManager();
  window.viewer.retrieve();
  setInterval(window.viewer.today.bind(window.viewer), 60000);
}

export { addEventListeners, init };
