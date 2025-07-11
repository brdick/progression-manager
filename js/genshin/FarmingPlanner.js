const {default:GenshinLootData} = await window.importer.get(`js/genshin/gamedata/GenshinLootData.js`);
const { Renderer } = await window.importer.get(`js/Renderer.js`);
const {default:UIController} = await window.importer.get(`js/UIController.js`);

export default class FarmingPlanner extends UIController
{
  static dontSerialize = ["viewer"];
  static templateName = "genshin/renderFarmingPlanner";
  
  constructor(viewer)
  {
    super();
    this.viewer = viewer;
    this.priorities = {
      characters: {},
      weapons: {}
    };
    this.doubleEvents = {
      character: false,
      talent: false,
      weapon: false,
      experience: false
    };
    
    // Generate a UUID for this instance
    this.uuid = this.generateUUID();
  }
  
  generateUUID() {
    return 'farming-planner-' + Math.random().toString(36).substr(2, 9);
  }
  
  // Get today's farmable materials based on current day
  getTodaysFarmableMaterials()
  {
    const today = this.viewer.today();
    const farmable = {
      mastery: [],
      forgery: [],
      doubleEventMaterials: []
    };
    
    // Check mastery materials available today
    for(let suffix in GenshinLootData.mastery)
    {
      if(GenshinLootData.mastery[suffix].days.includes(today))
      {
        farmable.mastery.push({
          name: suffix,
          source: GenshinLootData.mastery[suffix].source,
          tiers: [2, 3, 4] // Available tiers for mastery materials
        });
      }
    }
    
    // Check forgery materials available today
    for(let suffix in GenshinLootData.forgery)
    {
      if(GenshinLootData.forgery[suffix].days.includes(today))
      {
        farmable.forgery.push({
          name: suffix,
          source: GenshinLootData.forgery[suffix].source,
          tiers: [2, 3, 4, 5] // Available tiers for forgery materials
        });
      }
    }
    
    // Add double event materials if any events are active
    if(this.doubleEvents.character || this.doubleEvents.talent || this.doubleEvents.weapon || this.doubleEvents.experience)
    {
      // During double events, all materials are available regardless of day
      if(this.doubleEvents.character)
      {
        farmable.doubleEventMaterials.push({
          type: 'character',
          description: 'All character ascension materials (boss materials, local specialties, etc.)'
        });
      }
      
      if(this.doubleEvents.talent)
      {
        farmable.doubleEventMaterials.push({
          type: 'talent',
          description: 'All talent materials (books) - available all days during event'
        });
        
        // Add all mastery materials during talent event
        for(let suffix in GenshinLootData.mastery)
        {
          const existing = farmable.mastery.find(m => m.name === suffix);
          if(!existing)
          {
            farmable.mastery.push({
              name: suffix,
              source: GenshinLootData.mastery[suffix].source,
              tiers: [2, 3, 4],
              eventBonus: true
            });
          }
          else
          {
            existing.eventBonus = true;
          }
        }
      }
      
      if(this.doubleEvents.weapon)
      {
        farmable.doubleEventMaterials.push({
          type: 'weapon',
          description: 'All weapon ascension materials - available all days during event'
        });
        
        // Add all forgery materials during weapon event
        for(let suffix in GenshinLootData.forgery)
        {
          const existing = farmable.forgery.find(f => f.name === suffix);
          if(!existing)
          {
            farmable.forgery.push({
              name: suffix,
              source: GenshinLootData.forgery[suffix].source,
              tiers: [2, 3, 4, 5],
              eventBonus: true
            });
          }
          else
          {
            existing.eventBonus = true;
          }
        }
      }
      
      if(this.doubleEvents.experience)
      {
        farmable.doubleEventMaterials.push({
          type: 'experience',
          description: 'EXP books and Mora from Ley Lines'
        });
      }
    }
    
    return farmable;
  }
  
  // Get prioritized farming recommendations
  getPrioritizedRecommendations()
  {
    try {
      const recommendations = [];
      const materials = this.viewer.lists.MaterialList.items();
      const characters = this.viewer.lists.CharacterList.items();
      const weapons = this.viewer.lists.WeaponList.items();
      
      // Get character priorities with performance optimization
      const prioritizedCharacters = characters
        .filter(char => char.wishlist && this.priorities.characters[char.key])
        .sort((a, b) => (this.priorities.characters[b.key] || 0) - (this.priorities.characters[a.key] || 0))
        .slice(0, 20); // Limit to top 20 to prevent performance issues
      
      // Get weapon priorities with performance optimization
      const prioritizedWeapons = weapons
        .filter(wpn => wpn.wishlist && this.priorities.weapons[wpn.key])
        .sort((a, b) => (this.priorities.weapons[b.key] || 0) - (this.priorities.weapons[a.key] || 0))
        .slice(0, 20); // Limit to top 20 to prevent performance issues
      
      // Calculate needed materials for prioritized items
      for(let character of prioritizedCharacters)
      {
        try {
          const planMaterials = character.getPlanMaterials();
          for(let materialKey in planMaterials)
          {
            const material = this.viewer.lists.MaterialList.get(materialKey);
            if(material && planMaterials[materialKey] > 0)
            {
              recommendations.push({
                type: 'character',
                character: character,
                material: material,
                needed: planMaterials[materialKey],
                priority: this.priorities.characters[character.key] || 0,
                available: material.count || 0,
                deficit: Math.max(0, planMaterials[materialKey] - (material.count || 0))
              });
            }
          }
        } catch (error) {
          console.warn(`Error processing character ${character.key}:`, error);
        }
      }
      
      for(let weapon of prioritizedWeapons)
      {
        try {
          const planMaterials = weapon.getPlanMaterials();
          for(let materialKey in planMaterials)
          {
            const material = this.viewer.lists.MaterialList.get(materialKey);
            if(material && planMaterials[materialKey] > 0)
            {
              recommendations.push({
                type: 'weapon',
                weapon: weapon,
                material: material,
                needed: planMaterials[materialKey],
                priority: this.priorities.weapons[weapon.key] || 0,
                available: material.count || 0,
                deficit: Math.max(0, planMaterials[materialKey] - (material.count || 0))
              });
            }
          }
        } catch (error) {
          console.warn(`Error processing weapon ${weapon.key}:`, error);
        }
      }
      
      // Sort by priority and deficit
      recommendations.sort((a, b) => {
        if(a.priority !== b.priority) return b.priority - a.priority;
        return b.deficit - a.deficit;
      });
      
      return recommendations.slice(0, 50); // Limit to top 50 recommendations
    } catch (error) {
      console.error('Error getting prioritized recommendations:', error);
      return [];
    }
  }
  
  // Set priority for a character (1-10 scale)
  setCharacterPriority(characterKey, priority)
  {
    try {
      const normalizedPriority = Math.max(0, Math.min(10, parseInt(priority) || 0));
      this.priorities.characters[characterKey] = normalizedPriority;
      this.viewer.queueStore();
      return true;
    } catch (error) {
      console.error(`Error setting character priority for ${characterKey}:`, error);
      return false;
    }
  }
  
  // Set priority for a weapon (1-10 scale)
  setWeaponPriority(weaponKey, priority)
  {
    try {
      const normalizedPriority = Math.max(0, Math.min(10, parseInt(priority) || 0));
      this.priorities.weapons[weaponKey] = normalizedPriority;
      this.viewer.queueStore();
      return true;
    } catch (error) {
      console.error(`Error setting weapon priority for ${weaponKey}:`, error);
      return false;
    }
  }
  
  // Set double event status
  setDoubleEvent(eventType, isActive)
  {
    try {
      if(['character', 'talent', 'weapon', 'experience'].includes(eventType))
      {
        this.doubleEvents[eventType] = Boolean(isActive);
        this.viewer.queueStore();
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error setting double event ${eventType}:`, error);
      return false;
    }
  }
  
  // Quick increment material count
  incrementMaterial(materialKey, amount = 1)
  {
    try {
      const material = this.viewer.lists.MaterialList.get(materialKey);
      if(material) {
        const currentCount = material.count || 0;
        const newCount = Math.max(0, currentCount + amount);
        material.update("count", newCount);
        this.viewer.queueStore();
        return true;
      } else {
        console.warn(`Material not found: ${materialKey}`);
        return false;
      }
    } catch (error) {
      console.error(`Error incrementing material ${materialKey}:`, error);
      return false;
    }
  }
  
  // Get farming summary for today
  getFarmingSummary()
  {
    try {
      const farmable = this.getTodaysFarmableMaterials();
      const recommendations = this.getPrioritizedRecommendations();
      const today = this.viewer.today();
      
      // Filter recommendations to only show farmable today
      const todaysRecommendations = recommendations.filter(rec => {
        try {
          const material = rec.material;
          
          // Check if material is farmable today
          if(material.days && material.days.includes(today)) return true;
          
          // Check if it's available due to double events
          if(this.doubleEvents.talent && material.shorthand && Object.keys(GenshinLootData.mastery).includes(material.shorthand)) return true;
          if(this.doubleEvents.weapon && material.shorthand && Object.keys(GenshinLootData.forgery).includes(material.shorthand)) return true;
          if(this.doubleEvents.character && (material.type === 'boss' || material.type === 'flora')) return true;
          if(this.doubleEvents.experience && material.type === 'leyline') return true;
          
          return false;
        } catch (error) {
          console.warn('Error filtering recommendation:', error);
          return false;
        }
      });
      
      return {
        today: today,
        farmable: farmable,
        recommendations: todaysRecommendations.slice(0, 15), // Limit to top 15 for performance
        doubleEvents: this.doubleEvents
      };
    } catch (error) {
      console.error('Error getting farming summary:', error);
      return {
        today: 'Error',
        farmable: { mastery: [], forgery: [], doubleEventMaterials: [] },
        recommendations: [],
        doubleEvents: this.doubleEvents || { character: false, talent: false, weapon: false, experience: false }
      };
    }
  }
}
