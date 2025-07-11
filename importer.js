class Importer {
  timestamp;
  log = {};
  
  constructor() {
    this.timestamp = Date.now();
  }
  
  getVersion(normalFile) {
    // Simple timestamp-based versioning for cache busting
    // This works reliably across all deployment environments
    return Promise.resolve(this.timestamp.toString());
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
      this.log[normalFile] = this.getVersion(normalFile)
        .then(version => {
          let finalFile = `${normalFile}?v=${version}`;
          
          if (method === 'import') {
            return import('./'+finalFile).catch(importError => {
              // If module import fails, try without versioning as fallback
              console.warn(`Module import failed with versioning for ${normalFile}, trying without version:`, importError.message);
              return import('./'+normalFile);
            });
          } else {
            return fetch(finalFile).then(resp => {
              if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}: ${resp.statusText} when loading ${finalFile}`);
              }
              
              // Check if we got HTML instead of expected content
              if (method === 'json' || normalFile.endsWith('.js') || normalFile.endsWith('.html')) {
                return resp.text().then(text => {
                  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                    throw new Error(`Server returned HTML error page instead of ${normalFile} (likely 404/500 error)`);
                  }
                  return method === 'json' ? JSON.parse(text) : text;
                });
              }
              
              return method === 'json' ? resp.json() : resp.text();
            }).catch(fetchError => {
              // If fetch with versioning fails, try without versioning as fallback
              console.warn(`Fetch failed with versioning for ${normalFile}, trying without version:`, fetchError.message);
              return fetch(normalFile).then(resp => {
                if (!resp.ok) {
                  throw new Error(`HTTP ${resp.status}: ${resp.statusText} when loading ${normalFile} (fallback)`);
                }
                
                if (method === 'json' || normalFile.endsWith('.js') || normalFile.endsWith('.html')) {
                  return resp.text().then(text => {
                    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                      throw new Error(`Server returned HTML error page instead of ${normalFile}`);
                    }
                    return method === 'json' ? JSON.parse(text) : text;
                  });
                }
                
                return method === 'json' ? resp.json() : resp.text();
              });
            });
          }
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
    }
    
    return this.log[normalFile];
  }
}

window.importer = new Importer();
