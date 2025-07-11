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
    const recommendations = [];
    const materials = this.viewer.lists.MaterialList.items();
    const characters = this.viewer.lists.CharacterList.items();
    const weapons = this.viewer.lists.WeaponList.items();
    
    // Get character priorities
    const prioritizedCharacters = characters
      .filter(char => char.wishlist && this.priorities.characters[char.key])
      .sort((a, b) => (this.priorities.characters[b.key] || 0) - (this.priorities.characters[a.key] || 0));
    
    // Get weapon priorities  
    const prioritizedWeapons = weapons
      .filter(wpn => wpn.wishlist && this.priorities.weapons[wpn.key])
      .sort((a, b) => (this.priorities.weapons[b.key] || 0) - (this.priorities.weapons[a.key] || 0));
    
    // Calculate needed materials for prioritized items
    for(let character of prioritizedCharacters)
    {
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
    }
    
    for(let weapon of prioritizedWeapons)
    {
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
    }
    
    // Sort by priority and deficit
    recommendations.sort((a, b) => {
      if(a.priority !== b.priority) return b.priority - a.priority;
      return b.deficit - a.deficit;
    });
    
    return recommendations;
  }
  
  // Set priority for a character (1-10 scale)
  setCharacterPriority(characterKey, priority)
  {
    this.priorities.characters[characterKey] = Math.max(0, Math.min(10, priority));
    this.viewer.queueStore();
  }
  
  // Set priority for a weapon (1-10 scale)
  setWeaponPriority(weaponKey, priority)
  {
    this.priorities.weapons[weaponKey] = Math.max(0, Math.min(10, priority));
    this.viewer.queueStore();
  }
  
  // Set double event status
  setDoubleEvent(eventType, isActive)
  {
    if(['character', 'talent', 'weapon', 'experience'].includes(eventType))
    {
      this.doubleEvents[eventType] = isActive;
      this.viewer.queueStore();
    }
  }
  
  // Quick increment material count
  incrementMaterial(materialKey, amount = 1)
  {
    const material = this.viewer.lists.MaterialList.get(materialKey);
    if(material) {
      material.update("count", material.count + amount);
      this.viewer.queueStore();
    } else {
      console.warn(`Material not found: ${materialKey}`);
    }
  }
  
  // Get farming summary for today
  getFarmingSummary()
  {
    const farmable = this.getTodaysFarmableMaterials();
    const recommendations = this.getPrioritizedRecommendations();
    const today = this.viewer.today();
    
    // Filter recommendations to only show farmable today
    const todaysRecommendations = recommendations.filter(rec => {
      const material = rec.material;
      
      // Check if material is farmable today
      if(material.days && material.days.includes(today)) return true;
      
      // Check if it's available due to double events
      if(this.doubleEvents.talent && material.shorthand && Object.keys(GenshinLootData.mastery).includes(material.shorthand)) return true;
      if(this.doubleEvents.weapon && material.shorthand && Object.keys(GenshinLootData.forgery).includes(material.shorthand)) return true;
      if(this.doubleEvents.character && (material.type === 'boss' || material.type === 'flora')) return true;
      if(this.doubleEvents.experience && material.type === 'leyline') return true;
      
      return false;
    });
    
    return {
      today: today,
      farmable: farmable,
      recommendations: todaysRecommendations.slice(0, 20), // Limit to top 20
      doubleEvents: this.doubleEvents
    };
  }
}
