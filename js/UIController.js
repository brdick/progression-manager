const { handlebars, Renderer } = await window.importer.get(`js/Renderer.js`);

handlebars.registerHelper("getProperty", (item, property, options) => item instanceof UIController ? item.getProperty.call(item, property) : console.error(`Helper 'getProperty' must be called on a UIController.`, {item, property, options}));
handlebars.registerHelper("uuid", (item, options) => item instanceof UIController ? item.uuid : console.error(`Helper 'uuid' must be called on a UIController.`, {item, options}));
handlebars.registerHelper('toParam', (item, options) => item instanceof UIController ? item.uuid : typeof(item) == "object" ? item?.toString()??"" : item);

export default class UIController {
  static dontSerialize = ["uuid","importing","delayedUpdates","dependents","memory","_viewer"];
  static templateName;
  static templatePartials = [];
  
  static fromJSON(data, {addProperties={}}={})
  {
    let obj = new this();
    for(let prop in addProperties)
      obj[prop] = addProperties[prop];
    obj.startImport();
    for(let prop in obj)
      if(this.dontSerialize.indexOf(prop) == -1 && data[prop] !== undefined)
        obj.update(prop, data[prop], "replace");
    obj.finishImport();
    return obj;
  }
  
  uuid;
  importing;
  delayedUpdates;
  dependents;
  memory;
  _viewer;
  
  get viewer() { return this._viewer; }
  set viewer(val) { this._viewer = val; }
  
  constructor()
  {
    this.uuid = crypto.randomUUID();
    this.delayedUpdates = {};
    this.dependents = {};
    this.memory = {};
    Renderer.controllers.set(this.uuid, this);
  }
  
  parseProperty(path, {create=true}={})
  {
    if(!Array.isArray(path))
      path = path.split(".");
    let string = path.map(item => Array.isArray(item) ? (item[0] +":"+ item.slice(1).join(",")) : item).join(".");
    let obj = this;
    for(let i=0; i<path.length-1; i++)
    {
      if(Array.isArray(path[i]))
      {
        let func = path[i][0];
        if(typeof(obj[func]) == "function")
        {
          obj = obj[func].apply(obj, path[i].slice(1));
        }
        else
        {
          console.error(`Array given in path expression "${string}" in [${this.constructor.name} object].parseProperty, but [${obj.constructor.name} object].${func} is not a function. Arrays must correspond to functions and their arguments.`);
          return {string, path};
        }
      }
      else if(typeof(obj[path[i]]) == "function")
      {
        obj = obj[path[i]].call(obj);
      }
      else if(obj[path[i]] == undefined)
      {
        if(create)
        {
          obj[path[i]] = {};
          obj = obj[path[i]];
        }
        else
        {
          obj = undefined;
          break;
        }
      }
      else if(typeof(obj[path[i]]) != "object")
      {
        console.error(`[${this.constructor.name} object].${string} encountered a non-object at '${path[i]}'.`);
        return {string, path};
      }
      else
      {
        obj = obj[path[i]];
      }
      if(!obj)
        break;
      if(obj instanceof UIController)
        console.warn(`[UIController].parseProperty is traversing a different UIController from the one that called this method. Generally you should not do this, and should call parseProperty on that other UIController directly.`, {path, i, obj});
    }
    let property = path[path.length-1];
    let value;
    if(Array.isArray(property))
    {
      let func = property[0];
      if(typeof(obj[func]) == "function")
      {
        value = obj[func].apply(obj, property.slice(1));
      }
      else
      {
        console.error(`Array given in path expression "${string}" in [${this.constructor.name} object].parseProperty, but [${obj.constructor.name} object].${func} is not a function. Arrays must correspond to functions and their arguments.`);
        return {string, path};
      }
    }
    else
      value = obj?.[property];
    
    return {string, path, object:obj, property, value};
  }
  
  getProperty(prop, {create=true}={})
  {
    let parsed = this.parseProperty(prop, false);
    return typeof(parsed.value) === "function"
      ? parsed.value.call(parsed.object)
      : parsed.value;
  }
  
  /**
  The intended way to update any property on a UIController object, because it informs the dependent HTMLElements that the property has changed, so that they can updated.
  */
  update(field, value, action, options={})
  {
    field = this.parseProperty(field, {create: action!="notify"});
    value = this.beforeUpdate(field, value, action, options);
    let needsUpdate = false;
    if(action == "notify")
    {
      value = field.value;
      // Note: I'm not sure if "notify" always needs to trigger a viewer.store
      needsUpdate = true;
    }
    else if(typeof(field.value) == "function" || typeof(field.value) == "object")
    {
      if(!action)
        console.warn(`${this.constructor.name}.update() expects a third argument when the property being updated (${field.string}) is non-scalar (it's a ${typeof(field.value)}).`);
      else
      {
        if(Array.isArray(field.value))
        {
          if(action == "replace")
          {
            field.object[field.property] = value;
            for(let prev of field.value)
            {
              if(prev instanceof UIController)
                prev.notifyAll();
            }
            needsUpdate = true;
          }
          else if(action == "push")
          {
            field.object[field.property].push(value);
            needsUpdate = true;
          }
          else if(action == "remove")
          {
            let index;
            while((index = field.value.indexOf(value)) > -1)
              field.value.splice(index, 1);
            if(value instanceof UIController)
              value.notifyAll();
            needsUpdate = true;
          }
          else
            console.warn(`Unknown action '${action}' in ${this.constructor.name}.update() when updating array '${field.string}'.`);
        }
        else if(typeof(field.value) == "object")
        {
          if(action == "replace")
          {
            field.object[field.property] = value;
            needsUpdate = true;
          }
          else if(action == "delete")
          {
            delete field.object[field.property];
            needsUpdate = true;
          }
          else
            console.warn(`Unknown action '${action}' in ${this.constructor.name}.update() when updating object '${field.string}'.`);
        }
        else if(typeof(field.value) == "function")
        {
          console.warn(`Unknown action '${action}' in ${this.constructor.name}.update() when updating function '${field.string}'.`);
        }
      }
    }
    else
    {
      if(field.value !== value)
      {
        field.object[field.property] = value;
        needsUpdate = true;
      }
    }
    
    if(needsUpdate)
    {
      // TODO: this.viewer
      window.viewer.queueStore();
      for(let i=0; i<=field.path.length; i++)
      {
        let str = (i == 0 ? '.' : (i == field.path.length ? field.string : field.path.slice(0, i).join('.')));
        for(let dep of this.dependents[str] ?? [])
          if(dep)
            Renderer.queueUpdate(dep);
      }
    }
    this.afterUpdate(field, value, action, options);
    return this;
  }
  
  beforeUpdate(field, value, action, options)
  {
    // Code to validate the value before updating.
    return value;
  }
  
  afterUpdate(field, value, action, options)
  {
    if(this.importing)
    {
      this.delayedUpdates[field.path] = this.afterUpdate.bind(this, field, value, action, options);
      return false;
    }
    else
      return true;
    // Any code to run after a value is changed.
  }
  
  startImport(source=this.viewer?.constructor.name??"unknown")
  {
    this.importing = source;
  }
  
  finishImport()
  {
    this.importing = null;
    for(let update in this.delayedUpdates)
      this.delayedUpdates[update].call();
    this.delayedUpdates = {};
  }
  
  notifyAll()
  {
    for(let field in this.dependents)
      for(let dep of this.dependents[field] ?? [])
        if(dep)
          Renderer.queueUpdate(dep);
  }
  
  cleanupDependents()
  {
    for(let field in this.dependents)
      this.dependents[field] = this.dependents[field].filter(element => element && element.isConnected);
  }
  
  /**
  Add an HTMLElement that will need to be updated when the specified property(s) of this UIController are changed.
  */
  addDependent(prop, dep)
  {
    if(prop != ".")
    {
      prop = this.parseProperty(prop);
      if(!this.dependents[prop.string])
        this.dependents[prop.string] = [];
      this.dependents[prop.string].push(dep);
    }
    else
    {
      if(!this.dependents[prop])
        this.dependents[prop] = [];
      this.dependents[prop].push(dep);
    }
    return this;
  }
  
  removeDependent(prop, dep)
  {
    if(prop != ".")
    {
      prop = this.parseProperty(prop);
      if(this.dependents[prop.string])
        this.dependents[prop.string] = this.dependents[prop.string].filter(element => element != dep);
    }
    else
    {
      if(this.dependents[prop])
        this.dependents[prop] = this.dependents[prop].filter(element => element != dep);
    }
    return this;
  }
  
  static clearDependencies(element, children=false)
  {
    if(element.dependencies)
      for(let dep of element.dependencies)
        if(dep?.item && dep?.field)
          dep.item.removeDependent(dep.field, element);
    if(children)
      Array.from(element.children).forEach(elem => UIController.clearDependencies(elem,children));
  }
  
  /* Methods for saving/loading the results of other intensive methods that get called repeatedly in rapid succession, but will always return the same value. */
  
  saveMemory(data, ...path)
  {
    let mem = this.memory;
    for(let p of path)
    {
      if(!(p in mem))
        mem[p] = {};
      if(typeof(mem[p]) != "object")
      {
        console.error(`Memory address encountered a non-object along the path:`, mem[p], p, path.join("/"));
        return false;
      }
      mem = mem[p];
    }
    mem.__DATA__ = data;
    return true;
  }
  
  loadMemory(...path)
  {
    let mem = this.memory;
    for(let p of path)
    {
      if(!(p in mem))
        return undefined;
      if(typeof(mem[p]) != "object")
      {
        console.error(`Memory address encountered a non-object along the path:`, mem[p], p, path.join("/"));
        return undefined;
      }
      mem = mem[p];
    }
    return mem.__DATA__;
  }
  
  clearMemory(...path)
  {
    let pathEnd = path.pop();
    let mem = this.memory;
    for(let p of path)
    {
      if(!(p in mem))
        mem[p] = {};
      if(typeof(mem[p]) != "object")
      {
        console.error(`Memory address encountered a non-object along the path:`, mem[p], p, path.join("/"));
        return false;
      }
      mem = mem[p];
    }
    mem[pathEnd] = {};
    return true;
  }
  
  memoryFunction(func, ...path)
  {
    let result = this.loadMemory(...path);
    if(result === null || result === undefined)
    {
      result = func();
      this.saveMemory(result, ...path);
    }
    return result;
  }
  
  /* Methods with code specifically related to the HTML rendering of this UIController. */
  
  async getRelatedItems()
  {
    return {};
  }
  
  processRenderText(html)
  {
    return html;
  }
  
  preRender(element, options)
  {
  }
  
  async render(force=false)
  {
  }
  
  postRender(element)
  {
  }
  
  unlink({skipHTML}={})
  {
    Renderer.controllers.delete(this.uuid);
    if(!skipHTML)
      Renderer.removeElementsOf(this);
  }
  
  toJSON()
  {
    let result = {__class__: this.constructor.name};
    let serializing = new Set();
    
    const serializeProperty = (obj, key) => {
      const value = obj[key];
      const valueType = typeof value;
      
      // Skip functions and undefined values
      if (valueType === "function" || value === undefined) return undefined;
      
      // Handle primitive types
      if (["string", "boolean", "number", "bigint"].includes(valueType)) {
        return value;
      }
      
      // Handle null
      if (value === null) return null;
      
      // Handle arrays and objects - check for circular references
      if (valueType === "object") {
        // Prevent circular references
        if (serializing.has(value)) {
          return "[Circular Reference]";
        }
        
        // Don't serialize complex objects that might cause issues
        if (value.constructor && value.constructor.name && 
            ['HTMLElement', 'Node', 'Element'].includes(value.constructor.name)) {
          return "[DOM Element]";
        }
        
        serializing.add(value);
        try {
          if (Array.isArray(value)) {
            const result = value.map((item, index) => serializeProperty({[index]: item}, index)).filter(item => item !== undefined);
            serializing.delete(value);
            return result;
          } else {
            const result = {};
            for (let subKey in value) {
              if (value.hasOwnProperty(subKey)) {
                const serialized = serializeProperty(value, subKey);
                if (serialized !== undefined) {
                  result[subKey] = serialized;
                }
              }
            }
            serializing.delete(value);
            return result;
          }
        } catch (e) {
          serializing.delete(value);
          return "[Serialization Error]";
        }
      }
      
      return undefined;
    };
    
    for(let key of Object.keys(this)) {
      if(this.constructor.dontSerialize.indexOf(key) === -1) {
        const serialized = serializeProperty(this, key);
        if (serialized !== undefined) {
          result[key] = serialized;
        }
      }
    }
    
    return result;
  }
}
