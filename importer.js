class Importer {
  productionMode;
  commits;
  fileTimes;
  timestamp;
  log = {};
  
  constructor() {
    this.productionMode = location.hostname.includes("github.io");
    this.timestamp = Date.now();
  }
  
  getVersion(normalFile) {
    let result;
    if (this.productionMode) {
      if (!this.commits)
        this.commits = fetch("https://api.github.com/repos/kree-nickm/progression-manager/commits").then(resp => resp.json())
      
      result = this.commits.then(json => {
        if(json[0].sha)
          return json[0].sha;
        else
          throw new Error('No SHA identifier in latest github commit.');
      });
    }
    else {
      if (!this.fileTimes)
        this.fileTimes = fetch("fileVersion.php").then(resp => resp.json());
      
      result = this.fileTimes.then(json => {
        if (json[normalFile])
          return json[normalFile];
        else
          throw new Error('Did not find file in filectime record.');
      });
    }
    return result.catch(err => {
      // Only log warning for files that should exist, suppress for conditional/optional files
      if (!normalFile.includes('gamedata/') && !normalFile.includes('FurnitureSet') && !normalFile.includes('Furniture')) {
        console.warn(`Couldn't get version of file: ${normalFile}:`, err.message || err);
      }
      return 'ERROR_' + this.timestamp;
    });
  }
  
  normalize(uri) {
    let [filePath, query] = uri.split('?', 2);
    let rawPaths = filePath.split('/');
    let paths = [];
    for (let dir of rawPaths) {
      if (!dir || dir === '.')
        continue;
      else if (dir === '..')
        paths.pop();
      else
        paths.push(dir);
    }
    return paths.join('/');
  }
  
  get(file, method) {
    let normalFile = this.normalize(file);
    if (!method) {
      if (normalFile.endsWith('.js'))
        method = 'import';
      else if (normalFile.endsWith('.json'))
        method = 'json';
      else
        method = 'text';
    }
    
    if (!this.log[normalFile]) {
      //console.debug(`Importing ${normalFile}...`);
      this.log[normalFile] = this.getVersion(normalFile)
        .then(version => {
          let finalFile = `${normalFile}?v=${version}`;
          if (method === 'import')
            return import('./'+finalFile);
          else
            return fetch(finalFile).then(resp => method === 'json' ? resp.json() : resp.text());
        });
      //this.log[normalFile].then(imported => console.debug(`Imported ${normalFile}.`));
    }
    
    return this.log[normalFile];
  }
}

window.importer = new Importer();
