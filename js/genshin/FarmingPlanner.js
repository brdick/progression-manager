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
  
  // Get farming summary for today with smart filtering
  getFarmingSummary()
  {
    try {
      const farmable = this.getTodaysFarmableMaterials();
      const today = this.viewer.today();
      
      // Get smart filtered recommendations
      const smartRecommendations = this.getSmartFilteredRecommendations();
      
      return {
        today: today,
        farmable: farmable,
        recommendations: smartRecommendations,
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

  // Smart filtering logic - only show what's actually relevant today
  getSmartFilteredRecommendations()
  {
    try {
      const today = this.viewer.today();
      const allRecommendations = this.getPrioritizedRecommendations();
      
      // Filter to only show farmable and relevant items
      const smartFiltered = allRecommendations.filter(rec => {
        try {
          const material = rec.material;
          
          // Skip if no deficit (nothing needed)
          if (rec.deficit <= 0) return false;
          
          // Skip if priority is 0 (user doesn't want to farm this)
          if (rec.priority <= 0) return false;
          
          // Check if material is farmable today
          const isFarmableToday = this.isMaterialFarmableToday(material, today);
          if (!isFarmableToday) return false;
          
          return true;
        } catch (error) {
          console.warn('Error filtering recommendation:', error);
          return false;
        }
      });
      
      // Sort by priority (high to low), then by deficit (high to low)
      smartFiltered.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.deficit - a.deficit;
      });
      
      // Limit results to prevent UI overload
      const maxResults = 20;
      return smartFiltered.slice(0, maxResults);
      
    } catch (error) {
      console.error('Error getting smart filtered recommendations:', error);
      return [];
    }
  }
  
  // Check if a material can be farmed today
  isMaterialFarmableToday(material, today)
  {
    try {
      // Handle different material types
      const materialKey = material.key || material.shorthand;
      
      // Check domain materials (talent books)
      if (material.days && material.days.includes(today)) {
        return true;
      }
      
      // Check if available due to double events
      if (this.doubleEvents.talent && this.isTalentMaterial(materialKey)) {
        return true;
      }
      
      if (this.doubleEvents.weapon && this.isWeaponMaterial(materialKey)) {
        return true;
      }
      
      if (this.doubleEvents.character && this.isCharacterMaterial(material)) {
        return true;
      }
      
      if (this.doubleEvents.experience && this.isExperienceMaterial(material)) {
        return true;
      }
      
      // World bosses, ley lines, and local specialties are always farmable
      if (material.type === 'boss' || material.type === 'leyline' || material.type === 'flora') {
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Error checking if material is farmable today:', error);
      return false;
    }
  }
  
  // Helper methods to identify material types
  isTalentMaterial(materialKey)
  {
    return Object.keys(GenshinLootData.mastery || {}).includes(materialKey);
  }
  
  isWeaponMaterial(materialKey)
  {
    return Object.keys(GenshinLootData.forgery || {}).includes(materialKey);
  }
  
  isCharacterMaterial(material)
  {
    return material.type === 'boss' || material.type === 'flora' || 
           (material.category && material.category.includes('ascension'));
  }
  
  isExperienceMaterial(material)
  {
    return material.type === 'leyline' || 
           (material.key && material.key.includes('Experience'));
  }
}
