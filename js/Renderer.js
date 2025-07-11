import handlebars from 'https://cdn.jsdelivr.net/npm/handlebars@4.7.7/+esm';

handlebars.registerHelper("itemChildren", (item, field, options) => {
  let params = options.hash.params ? (Array.isArray(options.hash.params) ? options.hash.params : [options.hash.params]) : [];
  let fieldData = field.getAll(item, ...params);
  let result;
  if(fieldData.template)
  {
    let template = Renderer.getTemplatesSync(fieldData.template);
    if(template)
      result = template({item, field, params, fieldData});
    else
      return new handlebars.SafeString(`<span style="color:red;" title="An error occurred in the handlebards template. Check JavaScript console for details.">!</span>`);
  }
  else
    result = Renderer.contentToHTML(fieldData);
  result = item.processRenderText(result);
  
  let button = fieldData.button;
  if(!Array.isArray(button))
    button = [button];
  for(let btn of button)
  {
    if(btn)
    {
      let classes = [];
      if(btn.classes)
      {
        for(let cls in btn.classes)
          if(btn.classes[cls])
            classes.push(cls);
      }
      let inner = "";
      if(btn.text)
        inner = inner + handlebars.escapeExpression(btn.text);
      if(btn.icon)
        inner = inner + "<i class=\""+ handlebars.escapeExpression(btn.icon) +"\"></i>";
      result = result + "<button class=\"field-button "+ handlebars.escapeExpression(classes.join(" ")) +"\""+ (btn.action ? "" : " disabled=\"disabled\"") +" title=\""+ handlebars.escapeExpression(btn.title??"") +"\" name=\""+ (btn.name??"") +"\">"+ inner +"</button>";
    }
  }
  
  return new handlebars.SafeString(result);
});

handlebars.registerHelper("concat", (...params) => {
  let context = params.pop();
  return params.join(context.hash?.separator ?? "");
});

handlebars.registerHelper('times', function(n, options) {
  n = parseInt(n);
  let data = handlebars.createFrame(options.data);
  let accum = "";
  let start = options.hash?.start ?? 0;
  let num = n + start;
  for(let i=start; i<num; ++i)
  {
    data.index = i;
    data.first = (i === start);
    data.last = (i === num-1);
    accum += options.fn(this, {data});
  }
  return accum;
});

handlebars.registerHelper('invalidPartialCall', function(partial, note, options) {
  console.error(`Error using '${partial}' partial: ${note}`);
  console.error("Data:", this, "Options:", options);
  return new handlebars.SafeString(`<span style="color:red;" title="An error occurred in the handlebards template. Check JavaScript console for details.">!</span>`);
});

handlebars.registerHelper('logparams', function(...params) {
  console.log(this, ...params);
  return "";
});

handlebars.registerHelper('ifeq', function(first, second, options) {return (first === second || first == second && !options.hash.strict) ? options.fn(this) : options.inverse(this);});
handlebars.registerHelper('array', (...params) => params.slice(0, -1));
handlebars.registerHelper("lower", (str, options) => str.toLowerCase());
handlebars.registerHelper('fco', (value, fallback, options) => value ? value : fallback);
handlebars.registerHelper('nco', (value, fallback, options) => value ?? fallback);
handlebars.registerHelper('lookup', function(...params) {
  let options = params.pop();
  let base = params.shift();
  let obj = base;
  for(let prop of params)
  {
    if(obj === undefined || obj === null)
    {
      // Suppress warnings during initialization or when viewer is not ready
      if(!options.hash.ignoreEmpty && window.viewer?.initialized !== false) {
        console.warn(`Helper 'lookup' attempted to get property '${prop}' on undefined/null object: [base].${params.join('.')}; base:`, base);
      }
      return "";
    }
    if(typeof(obj) == "object")
      obj = obj[prop];
    else
    {
      // Suppress warnings during initialization or when viewer is not ready
      if(!options.hash.returnFirstScalar && window.viewer?.initialized !== false) {
        console.warn(`Helper 'lookup' attempted to get property '${prop}' on a ${typeof(obj)}: [base].${params.join('.')}; base:`, base);
      }
      return options.hash.returnFirstScalar ? obj : "";
    }
  }
  return obj;
});
handlebars.registerHelper('math', function(...params) {
  let context = params.pop();
  let [operation, ...values] = params;
  
  if(operation == "add")
    return values.reduce((acc, val) => acc + val, 0);
  else if(operation == "sub")
    return values.reduce((acc, val) => acc - val);
  else if(operation == "mul")
    return values.reduce((acc, val) => acc * val, 1);
  else if(operation == "div")
    return values.reduce((acc, val) => acc / val);
  else if(operation == "mod")
    return values.reduce((acc, val) => acc % val);
  else if(operation == "round")
    return Math.round(values[0]);
  else if(operation == "floor")
    return Math.floor(values[0]);
  else if(operation == "ceil")
    return Math.ceil(values[0]);
  
  return 0;
});

// Helper for farming planner
handlebars.registerHelper('add', function(a, b) {
  return (a || 0) + (b || 0);
});

handlebars.registerHelper('gt', function(a, b) {
  return (a || 0) > (b || 0);
});

handlebars.registerHelper('some', function(array, property) {
  if(!Array.isArray(array)) return false;
  return array.some(item => item && item[property]);
});

handlebars.registerHelper('getProperty', function(obj, property) {
  return obj ? obj[property] : undefined;
});

class Renderer
{
  static genericSorters = {
    'string': (prop,o,a,b) => {
      let A = String(a.getProperty(prop));
      let B = String(b.getProperty(prop));
      if(!A && B)
        return 1;
      else if(A && !B)
        return -1;
      else if(!A && !B)
        return 0;
      else
        return o*A.localeCompare(B);
    },
    'number': (prop,o,a,b) => {
      let A = parseFloat(a.getProperty(prop));
      let B = parseFloat(b.getProperty(prop));
      if(isNaN(A) && !isNaN(B))
        return 1;
      else if(!isNaN(A) && isNaN(B))
        return -1;
      else if(isNaN(A) && isNaN(B))
        return 0;
      else
        return o*(B-A);
    },
    'boolean': (prop,o,a,b) => {
      let A = a.getProperty(prop);
      let B = b.getProperty(prop);
      if(!A && B)
        return 1*o;
      else if(A && !B)
        return -1*o;
      else
        return 0;
    },
  };
  
  static partialsUsed = {
    'genshin/renderCharacterAsPopup': ["genshin/renderCharacterBuild","genshin/renderCharacterStats"],
    'genshin/renderCharacterBuild': ["genshin/renderCharacterBuildSlider","genshin/renderCharacterArtifactLists"],
    'genshin/renderCharacterArtifactLists': ["genshin/renderListAsColumn"],
    'genshin/renderListAsColumn': ["genshin/renderArtifactAsCard"],
    'genshin/renderCharacterStats': ["genshin/renderCharacterMainStats","genshin/renderCharacterReactions","genshin/renderCharacterMotionValues","genshin/renderCharacterStatModifiers"],
  };
  
  static controllers = new Map();
  static _needsUpdate = new Set();
  static _updateTimeout;
  static _templates = {};
  
  static queueUpdate(element)
  {
    if(element)
    {
      Renderer._needsUpdate.add(element);
      element.needsUpdate = true;
      if(window.DEBUGLOG.queueUpdate) console.debug(`Renderer.queueUpdate(1): Queuing update for:`, element);
    }
    if(Renderer._updateTimeout)
      clearTimeout(Renderer._updateTimeout);
    Renderer._updateTimeout = setTimeout(() => {
      Renderer._needsUpdate.forEach(element => {
        if(element.isConnected)
        {
          if(element.classList.contains("list-item-field"))
          {
            Renderer.renderItemField(element);
          }
          else
          {
            Renderer.rerender(element);
          }
        }
        else
        {
          if(window.DEBUGLOG.queueUpdate) console.warn(`Renderer.queueUpdate(1): Cannot update disconnected element:`, element);
        }
      });
      Renderer._needsUpdate.clear();
    }, 100);
  }
  
  static async getTemplates(...templates)
  {
    for(let i=0; i<templates.length; i++)
      if(Renderer.partialsUsed[templates[i]])
        templates = templates.concat(Renderer.partialsUsed[templates[i]]);
    for(let templateFile of templates)
    {
      if(templateFile && !Renderer._templates[templateFile])
      {
        try
        {
          Renderer._templates[templateFile] = await window.importer.get(`templates/${templateFile}.html`)
          .catch(err => console.error(`Template file not found 'templates/${templateFile}.html'.`, err))
          .then(src => {
            handlebars.registerPartial(templateFile, src);
            return handlebars.compile(src);
          });
        }
        catch(x)
        {
          console.error(x);
        }
      }
      else if(!templateFile)
      {
        console.warn(`Tried to load invalid template file '${templateFile}'.`);
        console.trace();
      }
    }
    return Renderer._templates;
  }
  
  static getTemplatesSync(...templates)
  {
    for(let i=0; i<templates.length; i++)
      if(Renderer.partialsUsed[templates[i]])
        templates = templates.concat(Renderer.partialsUsed[templates[i]]);
    for(let templateFile of templates)
    {
      if(templateFile && !Renderer._templates[templateFile])
      {
        console.error(`getTemplatesSync() tried to fetch template '${templateFile}' but it is not already loaded.`, {templates});
        return null;
      }
      else if(!templateFile)
      {
        console.warn(`Tried to load invalid template file '${templateFile}'.`);
        console.trace();
      }
    }
    return Renderer._templates;
  }
  
  static contentToHTML(content, path=[0])
  {
    if(typeof(content) == "string")
    {
      console.warn(`String "${content}" should be an object.`);
      let classes = [];
      if(path.length)
        classes.push("sub-"+ path.join("-"));
      return `<span class="value ${handlebars.escapeExpression(classes.join(' '))}">${handlebars.escapeExpression(content)}</span>`;
    }
    else if(typeof(content) == "object" && content != null)
    {
      if(window.DEBUGLOG.contentToHTML) console.debug(`Renderer.contentToHTML(2): Handling content object.`, content, path);
      let tag = content.tag ?? "span";
      let text = "";
      if(content.template?.reference)
      {
        if(content.value)
          console.warn(`Content has both template and value properties; ignoring value.`, content, path);
        text = content.template.reference(content.template.data ?? {});
      }
      else if(Array.isArray(content.value))
      {
        if(window.DEBUGLOG.contentToHTML) console.debug(`Handling array content.value.`);
        for(let i in content.value)
          if(content.value[i])
            text = text + Renderer.contentToHTML(content.value[i], path.concat([i]));
        if(window.DEBUGLOG.contentToHTML) console.debug(`Finished handling array.`, {text});
      }
      else if(typeof(content.value) == "object")
      {
        text = Renderer.contentToHTML(content.value, path.concat([0]));
      }
      else if(content.value || typeof(content.value) == "number")
      {
        let str = content.html ? content.value : handlebars.escapeExpression(content.value);
        text = `<span class="value">${str}</span>`;
      }
      if(content.icon)
        text = text + `<i class="icon ${handlebars.escapeExpression(content.icon)}"></i>`;
      if(window.DEBUGLOG.contentToHTML) console.debug(`Finished building text.`, text);
      
      let attrs = [];
      let classes = [];
      for(let cls in content.classes ?? [])
        if(content.classes[cls])
          classes.push(cls);
      if(path.length)
        classes.push("sub-"+ path.join("-"));
      if(classes.length)
        attrs.push(`class="${handlebars.escapeExpression(classes.join(' '))}"`);
      
      if(content.name)
        attrs.push(`name="${handlebars.escapeExpression(content.name)}"`);
      
      if(content.src)
      {
        attrs.push(`src="${content.src}"`);
        attrs.push(`loading="lazy"`);
      }
      
      if(content.alt)
        attrs.push(`alt="${content.alt}"`);
      
      if(content.title)
        attrs.push(`title="${handlebars.escapeExpression(content.title)}"`);
      
      if("onclick" in content && !content.onclick)
        attrs.push(`disabled="disabled"`);
      
      let style = "";
      if(content.background)
        style = style +`background:${content.background};`;
      if(content.color)
        style = style +`color:${content.color};`;
      if(content.width)
        style = style +`width:${content.width};`;
      if(content.shadow)
        style = style +`text-shadow:${content.shadow};`;
      if(style)
        attrs.push(`style="${style}"`);
      
      return `<${tag} ${attrs.join(' ')}` + (text!==""||tag=="i" ? `>${text}</${tag}>` : `/>`);
    }
    else
      return "";
  }
  
  static async rerender(element, data={}, {template,partials=[],showPopup,force=true,parentElement,renderedItem}={})
  {
    if(!element)
    {
      if(parentElement instanceof Element)
      {
        element = parentElement.appendChild(document.createElement("template"));
        force = true;
      }
      else
        return console.error(`Renderer.rerender(3) called with no element and no valid parentElement option.`);
    }
    else if(Array.isArray(element) || element instanceof NodeList)
    {
      return console.error(`Renderer.rerender(3) does not yet support multiple elements being passed in.`);
    }
    
    if(!data.item)
      data.item = Renderer.controllers.get(element.dataset.uuid);
    
    if(!data.item) return console.error(`Element has no associated item:`, element);
    
    // Anything the item needs to do to prepare for rendering. 
    renderedItem?.preRender(element, {template,force});
    data.item.preRender(element, {template,force});
    
    if(force)
    {
      parentElement = element.parentElement;
      if(!parentElement) return console.error(`Element has no parent:`, element);
      
      let index = Array.from(parentElement.children).indexOf(element);
      if(index == -1) return console.error(`Element can't be found within its parent:`, {element, parentElement});
      
      if(!template)
        template = element.dataset.template;
      if(!template) return console.error(`Element has no template:`, element);
      
      if(!data.filter && element.dataset.filter)
        data.filter = element.dataset.filter;
      
      if(!data.fields && data.item.display)
        data.fields = data.item.display.getFields().map(field => ({field, params:[]}));
      
      if(!data.groups && data.item.display)
        data.groups = data.item.display.getGroups({fieldDefs: data.fields});
      
      if(!data.relatedItems && typeof(data.item.getRelatedItems) === "function")
      {
        data.relatedParams = data.relatedParams ?? {};
        for(let attr in element.dataset)
          if(attr.startsWith("related_") && !(attr.slice(8) in data.relatedParams))
            data.relatedParams[attr.slice(8)] = element.dataset[attr];
        data.relatedItems = await data.item.getRelatedItems(data.relatedParams);
      }
      
      if(!data.items && typeof(data.item.items) === "function")
        data.items = data.item.items(data.filter);
      
      if(element.dataset.strings)
      {
        let strings = element.dataset.strings.split("; ");
        strings.forEach(str => {
          let idx = str.indexOf(":");
          if(idx > -1)
          {
            let key = str.slice(0, idx);
            let val = str.slice(idx+1);
            if(!data[key])
              data[key] = val;
            else
              console.warn(`Cannot overwrite existing data value with provided string value:`, {key, prev:data[key], val});
          }
        });
      }
      
      // Iterate through _needsUpdate and remove anything that's about to get overwritten, to prevent errors.
      data.item.constructor.clearDependencies(element, true);
      Renderer._needsUpdate.forEach(elemToUpdate => element.contains(elemToUpdate) ? Renderer._needsUpdate.delete(elemToUpdate) : null);
      
      let templates = await Renderer.getTemplates(template, "renderItemField", ...partials);
      element.outerHTML = templates[template](data);
      element = parentElement.children.item(index);
      
      // Iterate through all item fields.
      element.querySelectorAll(".list-item-field").forEach(Renderer.renderItemField);
    }
    
    // Add context-specific event handlers.
    if(!renderedItem)
      renderedItem = data.item;
    renderedItem.postRender(element);
    
    // Final UI preperation.
    $(element).find(".selectpicker").selectpicker('render');
    element.querySelectorAll(".popup-trigger").forEach(popupTrigger => {
      let item = Renderer.controllers.get(popupTrigger.dataset.uuid);
      if(!item)
      {
        let popupParent = popupTrigger.parentElement;
        while(popupParent && !popupParent.classList.contains("list-item"))
          popupParent = popupParent.parentElement;
        item = Renderer.controllers.get(popupParent.dataset.uuid);
      }
      if(item && item != data.item)
      {
        popupTrigger.onclick = event => {
          event.stopPropagation();
          Renderer.rerender(item.viewer.elements.popup.querySelector(".modal-content"), {item}, {
            template: item.constructor.templateName,
            partials: item.constructor.templatePartials,
            showPopup: true,
          });
        };
      }
    });
    
    // If we're opening a popup, handle the popup display.
    if(showPopup)
    {
      data.item.viewer.elements.popup.addEventListener("hidden.bs.modal", event => {
        event.target.breadcrumb = [];
      });
      let popup = data.item.viewer.elements.popup.querySelector(".modal-content");
      if(popup == element)
      {
        let breadcrumb = element.querySelector(".breadcrumb");
        if(!breadcrumb)
        {
          let modalBody = element.querySelector(".modal-body");
          breadcrumb = modalBody.insertBefore(document.createElement("ol"), modalBody.querySelector("[data-bs-dismiss='modal']").nextSibling ?? modalBody.firstChild);
          breadcrumb.classList.add("breadcrumb");
        }
        data.item.viewer.elements.popup.breadcrumb = data.item.viewer.elements.popup.breadcrumb ?? [];
        let idx = data.item.viewer.elements.popup.breadcrumb.indexOf(data.item);
        if(idx == -1)
          data.item.viewer.elements.popup.breadcrumb.push(data.item);
        breadcrumb.innerHTML = data.item.viewer.elements.popup.breadcrumb.map((item,i,array) => `<li class="breadcrumb-item ${item==data.item?"active":""}"><span data-uuid="${item.uuid}" data-breadcrumb-index="${i}">${item.name}</span></li>`).join("");
        for(let elem of breadcrumb.querySelectorAll(".breadcrumb-item:not(.active) span"))
        {
          elem.onclick = event => {
            let item = Renderer.controllers.get(event.target.dataset.uuid);
            item.viewer.elements.popup.breadcrumb = item.viewer.elements.popup.breadcrumb.slice(0, event.target.dataset.breadcrumbIndex);
            Renderer.rerender(element, {item}, {template: item.constructor.templateName, partials: item.constructor.templatePartials, showPopup: true});
          };
        }
      }
      bootstrap.Modal.getOrCreateInstance(data.item.viewer.elements.popup).show();
    }
  }
  
  static removeElementsOf(item, list)
  {
    let selector;
    if(list)
      selector = `*[data-uuid="${list.uuid}"] *[data-uuid="${item.uuid}"]:not(.modal-content)`;
    else
      selector = `*[data-uuid="${item.uuid}"]:not(.modal-content)`;
    Array.from(document.querySelectorAll(selector)).forEach(element => {
      //if(element == modal) continue;
      item.constructor.clearDependencies(element, true);
      Renderer._needsUpdate.forEach(elemToUpdate => element.contains(elemToUpdate) ? Renderer._needsUpdate.delete(elemToUpdate) : null);
      element.remove();
    });
  }
  
  static sortItems(listElement, {list,items,filter}={})
  {
    let listTargetElement;
    if(listElement.classList.contains("list"))
    {
      listTargetElement = listElement.querySelector(`.list-target[data-uuid="${listElement.dataset.uuid}"]`);
      if(!listTargetElement)
        listTargetElement = listElement;
    }
    else if(listElement.classList.contains("list-target"))
    {
      listTargetElement = listElement;
      while(listElement && !listElement.classList.contains("list") && listElement.dataset.uuid != listTargetElement.dataset.uuid)
        listElement = listElement.parentElement;
      if(!listElement)
        return console.error(`List target element has no list ancestor element.`, listTargetElement);
    }
    else
    {
      return console.error(`Element is neither a list nor list target.`, listElement);
    }
    
    if(!items)
    {
      if(!list)
        list = Renderer.controllers.get(listElement.dataset.uuid);
      if(!list)
        return console.error(`Item could not be determined from list element:`, listElement);
      if(!filter && listElement.dataset.filter)
        filter = listElement.dataset.filter;
      items = list.items(filter);
    }
    if(window.DEBUGLOG.sortItems) console.debug(`Sorting these items:`, {items, list, filter, listElement, listTargetElement});
    for(let item of items)
    {
      // Note: If the element list differs from the list of items, the extra elements will remain at the top.
      // TODO: Do we want to use UUID here instead of getUnique? This is the only thing keeping the "name='{{unique item}}'" attribute relavent in templates.
      let itemElement = listTargetElement.children.namedItem(item.getUnique()) ?? listTargetElement.children.find(elem => elem.dataset.uuid == item.uuid);
      if(itemElement)
        listTargetElement.appendChild(itemElement);
      else
        if(!window.importer.productionMode) console.warn(`Item does not appear to be on the list.`, {item, listTargetElement});
    }
  }
  
  static async renderItemField(element)
  {
    if(element.needsUpdate === false)
      return;
    
    // Get the field name first for reference.
    let fieldName = element.attributes.getNamedItem('name')?.value;
    if(!fieldName)
    {
      console.error(`Element has no name attribute specifying a field.`, element);
      return;
    }
    
    // Determine the item for the field.
    let item = Renderer.controllers.get(element.dataset.uuid);
    if(!item)
    {
      console.error(`Unable to find item for element.`, {element});
      return false;
    }
    
    // Get the field data.
    let field = item.display.getField(fieldName);
    if(!field)
    {
      console.error(`Unable to determine '${fieldName}' field of item '${item.name??item.uuid}':`, element);
      return false;
    }
    
    // Parse out the parameters for the item field.
    let params = [];
    for(let i=0,p=element.dataset['param'+i]; p!==undefined; p=element.dataset['param'+(++i)])
    {
      let param = p.split("##");
      if(param.length == 2)
        params.push(window.viewer.lists[param[0]].get(param[1]));
      else
      {
        let controller;
        if(controller = Renderer.controllers.get(p))
          params.push(controller);
        else if(p === "true")
          params.push(true);
        else if(p === "false")
          params.push(false);
        else if(!isNaN(p))
          params.push(parseFloat(p));
        else
          params.push(p);
      }
    }
    
    // Fetch all the field properties, and clone the dependencies since we are about to modify them.
    let fieldData = field.getAll(item, ...params);
    fieldData.dependencies = fieldData.dependencies ? [...fieldData.dependencies] : [];
    
    if(!Array.isArray(fieldData.button))
      fieldData.button = [fieldData.button];
    
    if(window.DEBUGLOG.renderItemField) console.debug(`Renderer.renderItemField(1): Rendering item field:`, element, params, fieldData);
    
    // Render the Handlebars template if the field has changed.
    if(element.needsUpdate)
    {
      // Remove old dependency definitions.
      item.constructor.clearDependencies(element);
      
      // Remember specific classes that the element might have that are not a part of the template.
      let readdClasses = { // I'm not a fan of this implementation (hard-coding the classes), but it's the first one I thought of.
        'group-collapsed': element.classList.contains("group-collapsed"),
      };
      
      let parentElement = element.parentElement;
      if(!parentElement) return console.error(`Element has no parent:`, element);
      
      let index = Array.from(parentElement.children).indexOf(element);
      if(index == -1) return console.error(`Element can't be found within its parent:`, element, parentElement);
      
      // Load the template, set the outerHTML, and reacquire the element reference.
      let templates = await Renderer.getTemplates("renderItemField");
      element.outerHTML = templates["renderItemField"]({
        item,
        field,
        wrapper: element.tagName,
        params: params,
      });
      element = parentElement.children.item(index);
      
      // Re-add the classes that we remembered.
      for(let cls in readdClasses)
        if(readdClasses[cls])
          element.classList.add(cls);
    }
    element.needsUpdate = false;
    
    // Check for button event handlers. TODO: Replace this with an "onclick" check.
    for(let b in fieldData.button)
    {
      let btn = fieldData.button[b];
      if(btn)
      {
        let buttonElement = element.querySelector("button[name=\""+(btn.name??"")+"\"]");
        if(btn.action && buttonElement && !buttonElement.onclick)
          buttonElement.onclick = btn.action;
      }
    }
    
    if(fieldData.template)
    {
      // If this field uses a template, recursively call this method on any other item fields that it might contain.
      element.querySelectorAll(".list-item-field").forEach(Renderer.renderItemField);
    }
    else
    {
      // Add event handlers to interactable parts of the HTML. Define that process as a function so we can recursively call it if the field value is a nest of sub-values.
      let handleSubEdit = (subContent,path=[0]) => {
        if(Array.isArray(subContent.value))
        {
          for(let i in subContent.value)
            if(subContent.value[i])
              handleSubEdit(subContent.value[i], path.concat([i]));
        }
        else if(subContent.value && typeof(subContent.value) == "object")
          handleSubEdit(subContent.value, path.concat([0]));
        
        let subElement = element.querySelector(".sub-"+ path.join("-"));
        if(!subElement)
        {
          console.error(`Cannot find descendant of field element along the content value path.`, element, ".sub-"+ path.join("-"), subContent);
          return;
        }
        
        if(subContent.edit)
        {
          if(window.DEBUGLOG.renderItemField) console.debug(`Adding edit event listeners to subelement (field:${fieldName}, item:${item.name??item.uuid}).`, subElement, subContent);
          if(subContent.edit.target)
            fieldData.dependencies.push(subContent.edit.target);
          Renderer.addFieldEventListeners(subElement, subContent);
        }
        else if(subContent.popup)
        {
          // Make sure this link is not trying to open a popup that is already open.
          let popup = subContent.popup.viewer.elements.popup.classList.contains("show") ? subElement.parentElement : null;
          while(popup && !popup.classList.contains("modal-content"))
            popup = popup.parentElement;
          let currentPopup = popup ? Renderer.controllers.get(popup.dataset.uuid) : null
          if(!subElement.onclick && currentPopup != subContent.popup)
          {
            if(window.DEBUGLOG.renderItemField) console.debug(`Adding popup event listener to subelement (field:${fieldName}, item:${item.name??item.uuid}).`, subElement, subContent);
            subElement.onclick = event => {
              event.stopPropagation();
              Renderer.rerender(subContent.popup.viewer.elements.popup.querySelector(".modal-content"), {item: subContent.popup}, {template: subContent.popup.constructor.templateName, partials: subContent.popup.constructor.templatePartials, showPopup: true, parentElement: subContent.popup.viewer.elements.popup});
            };
            subElement.classList.add("popup");
            subElement.dataset.uuid = subContent.popup.uuid;
          }
        }
      };
      handleSubEdit(fieldData);
    }
    
    // If this cell's data is dependent on other fields, set up a trigger to update this cell when those fields are changed.
    if(!element.dependencies)
    {
      element.dependencies = fieldData.dependencies;
      for(let dep of element.dependencies)
      {
        if(dep?.item && dep?.field)
        {
          if(window.stringInstanceOf(dep.item, "UIController"))
            dep.item.addDependent(dep.field, element);
          else
            console.error(`Cannot add dependency to a non-UIController.`, {item:dep.item, field:dep.field, fieldData});
        }
        else if(dep?.type)
          element.classList.add("type-dependent");
      }
    }
  }
  
  static addFieldEventListeners(fieldElement, content)
  {
    if(window.DEBUGLOG.addFieldEventListeners) console.debug(`Renderer.addFieldEventListeners(2): Adding event listeners:`, fieldElement, content);
    fieldElement.editingData = content.edit;
    fieldElement.editValue = content.edit.value ?? content.value ?? "";
    let editElement = fieldElement.querySelector(".edit-element");
    // TODO: Move this to contentToHTML
    if(!editElement)
    {
      // Create the input element for editing.
      if(content.edit.type == "checkbox")
      {
        // Add icon to indicate status.
        if(content.edit.applySelf)
        {
          editElement = fieldElement;
          editElement.classList.add("apply-self");
        }
        else if(content.edit.prepend)
          editElement = fieldElement.insertBefore(document.createElement("i"), fieldElement.childNodes[0] ?? null);
        else
          editElement = fieldElement.appendChild(document.createElement("i"));
        fieldElement.editChecked = !!(content.edit.checked ?? content.edit.value ?? false);
      }
      else if(content.edit.type == "select")
      {
        // Add select element.
        editElement = fieldElement.appendChild(document.createElement("select"));
        let optionDefault = editElement.appendChild(document.createElement("option"));
        if(content.edit.defaultOption)
        {
          optionDefault.value = content.edit.defaultOption.value;
          optionDefault.innerHTML = content.edit.defaultOption.display;
        }
        for(let opt of content.edit.list)
        {
          let option = editElement.appendChild(document.createElement("option"));
          
          if(typeof(content.edit.valueProperty) == "function")
            option.value = content.edit.valueProperty.call(option, opt);
          else if(content.edit.valueProperty)
            option.value = opt[content.edit.valueProperty];
          else if(typeof(opt) == "object" && opt.value && opt.display)
            option.value = opt.value;
          else
            option.value = opt;
          
          if(typeof(content.edit.displayProperty) == "function")
            option.innerHTML = content.edit.displayProperty.call(option, opt);
          else if(content.edit.displayProperty)
            option.innerHTML = opt[content.edit.displayProperty];
          else if(typeof(opt) == "object" && opt.value && opt.display)
            option.innerHTML = opt.display;
          else
            option.innerHTML = option.value;
        }
        for(let opt of editElement.options)
          if(opt.innerHTML == fieldElement.editValue)
            editElement.selectedIndex = opt.index;
      }
      else
      {
        // Add input element.
        editElement = fieldElement.appendChild(document.createElement("input"));
        editElement.type = content.edit.type ?? "number";
        if(content.edit.min !== undefined)
        {
          editElement.min = parseFloat(content.edit.min);
        }
        if(content.edit.max !== undefined)
        {
          editElement.max = parseFloat(content.edit.max);
          editElement.size = String(editElement.max).length;
        }
      }
      editElement.classList.add("edit-element");
    }
    
    // Add event listeners.
    if(content.edit.type == "checkbox")
    {
      if(!fieldElement.onclick)
      {
        if(fieldElement.editingData.target)
        {
          fieldElement.onclick = event => {
            let fieldData = fieldElement.editingData.target.item.parseProperty(fieldElement.editingData.target.field);
            if(Array.isArray(fieldData.value))
              fieldElement.editingData.target.item.update(fieldElement.editingData.target.field, fieldElement.editValue, fieldElement.editChecked ? "remove" : "push");
            else
              fieldElement.editingData.target.item.update(fieldElement.editingData.target.field, !fieldElement.editChecked);
          };
          fieldElement.classList.add("editable");
          if(window.DEBUGLOG.addFieldEventListeners) console.debug(`Added onclick method to field element.`, fieldElement.onclick);
        }
        else if(fieldElement.editingData.func)
        {
          fieldElement.onclick = fieldElement.editingData.func;
          fieldElement.classList.add("editable");
          if(window.DEBUGLOG.addFieldEventListeners) console.debug(`Added onclick method to field element.`, fieldElement.onclick);
        }
        else
        {
          console.warn(`Field has an edit property but no target nor function specified on the field element.`, content.edit);
        }
      }
      else
      {
        if(window.DEBUGLOG.addFieldEventListeners) console.debug(`Field element aready has an onclick method.`, fieldElement.onclick);
      }
    }
    else
    {
      // Event to begin editing when the plain field is clicked.
      if(content.edit.alwaysShow)
      {
        Renderer.beginEditing(editElement, {
          currentTarget: fieldElement,
          target: fieldElement,
        });
        fieldElement.classList.add("editable");
        if(content.edit.type != "select")
          editElement.value = editElement.placeholder;
        if(content.edit.type == "select")
          editElement.classList.add("form-select");
        else
          editElement.classList.add("form-control");
        for(let node of fieldElement.children)
          if(node !== editElement)
            fieldElement.removeChild(node);
      }
      else if(!fieldElement.onclick)
      {
        fieldElement.onclick = Renderer.beginEditing.bind(Renderer, editElement);
        fieldElement.classList.add("editable");
        if(window.DEBUGLOG.addFieldEventListeners) console.debug(`Added onclick method to field element.`, fieldElement.onclick);
      }
      else
      {
        if(window.DEBUGLOG.addFieldEventListeners) console.debug(`Field element aready has an onclick method.`, fieldElement.onclick);
      }
      
      // Event to save the edit.
      if(!editElement.onchange || !editElement.onblur || !editElement.onkeydown)
      {
        let endEditing = Renderer.endEditing.bind(Renderer, fieldElement);
        editElement.onkeydown = endEditing;
        editElement.onchange = endEditing;
        editElement.onblur = endEditing;
      }
    }
    
    // Update values of the edit element.
    if(content.edit.type == "checkbox")
    {
      if(!fieldElement.editChecked)
      {
        if(content.edit.trueClasses)
          editElement.classList.remove(...content.edit.trueClasses);
        if(content.edit.falseClasses)
          editElement.classList.add(...content.edit.falseClasses);
      }
      else
      {
        if(content.edit.falseClasses)
          editElement.classList.remove(...content.edit.falseClasses);
        if(content.edit.trueClasses)
          editElement.classList.add(...content.edit.trueClasses);
      }
    }
  }
  
  static beginEditing(editElement, event)
  {
    // Abort if we're already editing, or if this is a drop-down menu item (might be redundant).
    if(event.currentTarget.classList.contains("editing") || event.target.nodeName == "OPTION")
      return;
    
    event.currentTarget.classList.add("editing");
    let placeholder = event.currentTarget.editingData.target?.item?.getProperty(event.currentTarget.editingData.target?.field) ?? event.currentTarget.editValue;
    if(!placeholder && placeholder !== 0)
      placeholder = event.currentTarget.innerText;
    
    if(event.currentTarget.editingData.type == "select")
    {
      for(let opt of editElement.options)
        if(opt.innerHTML == event.currentTarget.editValue)
          editElement.selectedIndex = opt.index;
    }
    else
    {
      editElement.placeholder = placeholder;
      editElement.value = "";
    }
    
    // Focus the newly shown edit element, unless it's always shown.
    if(!event.currentTarget.editingData.alwaysShow)
      editElement.focus();
  }
  
  static endEditing(fieldElement, event)
  {
    // If we pressed a key other than Enter or Esc, do nothing.
    if(event.type === "keydown" && event.key !== "Esc" && event.key !== "Escape" && event.key !== "Enter" && event.key !== "Tab")
      return
    
    // If we're not even editing, do nothing.
    if(!fieldElement.classList.contains("editing"))
      return;
    
    // Stop other events from triggering, if for example we ended this edit by clicking on something else on the UI that might start doing undesirable stuff, when all you wanted was to save the edit.
    // TODO: Actually allow this for other editable elements, so you can easily change a bunch one after the other.
    event.stopPropagation();
    
    // Set appropriate properties on the field element to indicate that it is no longer being edited.
    if(!fieldElement.editingData.alwaysShow)
      fieldElement.classList.remove("editing");
    
    // Cancel the edit without saving if Esc was pressed.
    if(event.type === "keydown" && (event.key === "Esc" || event.key === "Escape"))
      return;
    
    // Save value to a new variable, because we will be modifying it.
    let val = event.currentTarget.value;
    
    // Cancel the save on a blank value, unless either a special handler/value has been specified for blank values, or this is a select menu.
    if(val === "")
    {
      if(typeof(fieldElement.editingData.onBlank) == "function")
      {
        val = fieldElement.editingData.onBlank(fieldElement, event.currentTarget);
        if(val === null || val === undefined)
          return;
      }
      else if('onBlank' in fieldElement.editingData)
        val = fieldElement.editingData.onBlank;
      else if(event.currentTarget.type != "select" && event.currentTarget.type != "select-one")
        return;
    }
    
    // Resolve the value if it is of a specific type.
    if(event.currentTarget.type == "number")
    {
      val = parseFloat(val);
      if(isNaN(val))
      {
        console.warn(`Can't set field to a non-numerical value.`, {value:event.currentTarget.value});
        return false;
      }
    }
    else if(fieldElement.editingData.valueFormat == "uuid")
    {
      val = Renderer.controllers.get(val);
      if(!val)
      {
        console.warn(`Can't set field to an invalid uuid.`, {value:event.currentTarget.value});
        return false;
      }
    }
    
    // Save the new value.
    if(fieldElement.editingData.target)
      fieldElement.editingData.target.item.update(fieldElement.editingData.target.field, val, "replace");
    else if(fieldElement.editingData.func)
      fieldElement.editingData.func(val);
    else
      throw new Error(`Neither fieldElement.editingData.target nor fieldElement.editingData.func were specifed.`, {fieldElement, editingData:fieldElement.editingData});
  }
}

export { handlebars, Renderer };
