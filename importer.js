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
            return fetch(finalFile).then(resp => {
              if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}: ${resp.statusText} when loading ${finalFile}`);
              }
              
              // Check if we got HTML instead of expected content
              if (method === 'json' || normalFile.endsWith('.js')) {
                return resp.text().then(text => {
                  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                    throw new Error(`Server returned HTML error page instead of ${normalFile} (likely 404/500 error)`);
                  }
                  return method === 'json' ? JSON.parse(text) : text;
                });
              }
              
              return method === 'json' ? resp.json() : resp.text();
            });
        })
        .catch(error => {
          console.error(`Failed to load ${normalFile}:`, error);
          
          // For critical files, provide a more descriptive error
          if (normalFile.includes('/load.js')) {
            throw new Error(`Game files are currently unavailable. Server may be down (${error.message})`);
          }
          
          // For templates, provide fallback content
          if (normalFile.includes('templates/')) {
            if (normalFile.includes('menuModals.html')) {
              return '<div class="modal fade" id="loadModal"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5>Import unavailable</h5></div></div></div></div>';
            }
            if (normalFile.includes('menuButtons.html')) {
              return '<button class="btn btn-secondary disabled">Functions unavailable</button>';
            }
          }
          
          // Re-throw for other files
          throw error;
        });
      //this.log[normalFile].then(imported => console.debug(`Imported ${normalFile}.`));
    }
    
    return this.log[normalFile];
  }
}

window.importer = new Importer();
