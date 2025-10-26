"use client";

import React, { useState, useMemo } from 'react';

interface EmojiBankProps {
  onSelectEmoji: (emoji: string) => void;
  selectedEmoji?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function EmojiBank({ onSelectEmoji, selectedEmoji, searchQuery = '', onSearchChange }: EmojiBankProps) {
  // Comprehensive emoji database with proper search functionality
  const EMOJI_DATABASE = [
    // Halloween & Spooky
    { emoji: '🎃', name: 'Pumpkin', keywords: ['pumpkin', 'halloween', 'orange', 'jack', 'lantern', 'carved'] },
    { emoji: '👻', name: 'Ghost', keywords: ['ghost', 'spooky', 'white', 'scary', 'spirit', 'haunted'] },
    { emoji: '💀', name: 'Skull', keywords: ['skull', 'bone', 'death', 'spooky', 'skeleton', 'dead'] },
    { emoji: '🕷️', name: 'Spider', keywords: ['spider', 'web', 'bug', 'creepy', 'arachnid', 'crawly'] },
    { emoji: '🦇', name: 'Bat', keywords: ['bat', 'flying', 'dark', 'night', 'winged', 'vampire'] },
    { emoji: '🧙‍♀️', name: 'Witch', keywords: ['witch', 'magic', 'hat', 'broom', 'spell', 'wizard'] },
    { emoji: '🧹', name: 'Broom', keywords: ['broom', 'cleaning', 'witch', 'flying', 'sweep', 'handle'] },
    { emoji: '🍭', name: 'Candy', keywords: ['candy', 'sweet', 'lollipop', 'treat', 'sugar', 'sucker'] },
    { emoji: '⚰️', name: 'Coffin', keywords: ['coffin', 'death', 'burial', 'dark', 'grave', 'casket'] },
    { emoji: '🔮', name: 'Crystal Ball', keywords: ['crystal', 'ball', 'magic', 'fortune', 'future', 'prediction'] },
    { emoji: '🧟‍♂️', name: 'Zombie', keywords: ['zombie', 'undead', 'walking', 'dead', 'monster', 'infected'] },
    { emoji: '🧛‍♂️', name: 'Vampire', keywords: ['vampire', 'blood', 'fangs', 'night', 'undead', 'dracula'] },

    // Christmas & Winter
    { emoji: '🎄', name: 'Tree', keywords: ['tree', 'christmas', 'pine', 'decorated', 'holiday', 'fir'] },
    { emoji: '🎁', name: 'Gift', keywords: ['gift', 'present', 'box', 'wrapped', 'surprise', 'package'] },
    { emoji: '🎅', name: 'Santa', keywords: ['santa', 'claus', 'beard', 'red', 'christmas', 'jolly'] },
    { emoji: '⛄', name: 'Snowman', keywords: ['snowman', 'snow', 'winter', 'carrot', 'frosty', 'cold'] },
    { emoji: '🔔', name: 'Bell', keywords: ['bell', 'ring', 'sound', 'gold', 'jingle', 'chime'] },
    { emoji: '⭐', name: 'Star', keywords: ['star', 'bright', 'shining', 'gold', 'sparkle', 'twinkle'] },
    { emoji: '👼', name: 'Angel', keywords: ['angel', 'wings', 'heaven', 'white', 'divine', 'holy'] },
    { emoji: '🦌', name: 'Reindeer', keywords: ['reindeer', 'deer', 'antlers', 'brown', 'rudolph', 'christmas'] },
    { emoji: '🛷', name: 'Sleigh', keywords: ['sleigh', 'sled', 'santa', 'ride', 'snow', 'winter'] },
    { emoji: '🎀', name: 'Bow', keywords: ['bow', 'ribbon', 'decoration', 'gift', 'pretty', 'tie'] },
    { emoji: '🔥', name: 'Fire', keywords: ['fire', 'flame', 'warm', 'cozy', 'heat', 'burn'] },
    { emoji: '❄️', name: 'Snowflake', keywords: ['snowflake', 'snow', 'ice', 'cold', 'winter', 'frozen'] },
    { emoji: '🧊', name: 'Ice', keywords: ['ice', 'cold', 'frozen', 'crystal', 'winter', 'chill'] },
    { emoji: '🥶', name: 'Cold Face', keywords: ['cold', 'freezing', 'blue', 'face', 'winter', 'chilly'] },
    { emoji: '☕', name: 'Hot Drink', keywords: ['hot', 'drink', 'coffee', 'warm', 'mug', 'beverage'] },
    { emoji: '🧤', name: 'Mittens', keywords: ['mittens', 'gloves', 'hands', 'warm', 'winter', 'fingers'] },
    { emoji: '🧣', name: 'Scarf', keywords: ['scarf', 'neck', 'warm', 'wrapped', 'winter', 'cozy'] },
    { emoji: '🥾', name: 'Boots', keywords: ['boots', 'shoes', 'feet', 'warm', 'winter', 'hiking'] },
    { emoji: '🎿', name: 'Ski', keywords: ['ski', 'snow', 'sport', 'winter', 'slope', 'mountain'] },
    { emoji: '🐧', name: 'Penguin', keywords: ['penguin', 'bird', 'black', 'white', 'antarctic', 'waddle'] },
    { emoji: '🐻‍❄️', name: 'Polar Bear', keywords: ['polar', 'bear', 'white', 'arctic', 'cold', 'snow'] },

    // Spring & Nature
    { emoji: '🌸', name: 'Flower', keywords: ['flower', 'blossom', 'pink', 'spring', 'petal', 'bloom'] },
    { emoji: '🌷', name: 'Tulip', keywords: ['tulip', 'flower', 'red', 'spring', 'bulb', 'garden'] },
    { emoji: '🌹', name: 'Rose', keywords: ['rose', 'flower', 'red', 'love', 'romantic', 'thorn'] },
    { emoji: '🌻', name: 'Sunflower', keywords: ['sunflower', 'yellow', 'bright', 'summer', 'sun', 'seed'] },
    { emoji: '🦋', name: 'Butterfly', keywords: ['butterfly', 'wings', 'colorful', 'flying', 'insect', 'beautiful'] },
    { emoji: '🐝', name: 'Bee', keywords: ['bee', 'buzz', 'yellow', 'black', 'honey', 'pollen'] },
    { emoji: '🐞', name: 'Ladybug', keywords: ['ladybug', 'red', 'spots', 'bug', 'lucky', 'garden'] },
    { emoji: '🌈', name: 'Rainbow', keywords: ['rainbow', 'colors', 'arc', 'sky', 'rain', 'prism'] },
    { emoji: '☀️', name: 'Sun', keywords: ['sun', 'bright', 'yellow', 'warm', 'day', 'light'] },
    { emoji: '🌧️', name: 'Rain', keywords: ['rain', 'water', 'drops', 'cloud', 'wet', 'storm'] },
    { emoji: '☂️', name: 'Umbrella', keywords: ['umbrella', 'rain', 'protection', 'cover', 'dry', 'shelter'] },
    { emoji: '🌱', name: 'Seedling', keywords: ['seedling', 'plant', 'grow', 'green', 'sprout', 'new'] },

    // Summer & Beach
    { emoji: '🏖️', name: 'Beach', keywords: ['beach', 'sand', 'ocean', 'summer', 'shore', 'vacation'] },
    { emoji: '🌴', name: 'Palm Tree', keywords: ['palm', 'tree', 'tropical', 'green', 'coconut', 'island'] },
    { emoji: '🕶️', name: 'Sunglasses', keywords: ['sunglasses', 'glasses', 'sun', 'cool', 'shade', 'style'] },
    { emoji: '🍦', name: 'Ice Cream', keywords: ['ice', 'cream', 'cold', 'sweet', 'dessert', 'treat'] },
    { emoji: '🍉', name: 'Watermelon', keywords: ['watermelon', 'fruit', 'red', 'green', 'summer', 'juicy'] },
    { emoji: '🍋', name: 'Lemon', keywords: ['lemon', 'yellow', 'sour', 'citrus', 'fruit', 'tart'] },
    { emoji: '🥥', name: 'Coconut', keywords: ['coconut', 'tropical', 'brown', 'white', 'milk', 'island'] },
    { emoji: '🩴', name: 'Flip Flops', keywords: ['flip', 'flops', 'sandals', 'beach', 'summer', 'feet'] },
    { emoji: '🏊‍♂️', name: 'Swimming', keywords: ['swimming', 'pool', 'water', 'sport', 'swim', 'dive'] },
    { emoji: '🏄‍♂️', name: 'Surfing', keywords: ['surfing', 'wave', 'ocean', 'board', 'ride', 'beach'] },
    { emoji: '⛺', name: 'Camping', keywords: ['camping', 'tent', 'outdoor', 'nature', 'wild', 'adventure'] },

    // Fall & Harvest
    { emoji: '🍂', name: 'Leaf', keywords: ['leaf', 'brown', 'fall', 'autumn', 'tree', 'season'] },
    { emoji: '🍁', name: 'Maple Leaf', keywords: ['maple', 'leaf', 'red', 'canada', 'fall', 'autumn'] },
    { emoji: '🍎', name: 'Apple', keywords: ['apple', 'red', 'fruit', 'harvest', 'healthy', 'crisp'] },
    { emoji: '🌰', name: 'Acorn', keywords: ['acorn', 'nut', 'brown', 'oak', 'tree', 'squirrel'] },
    { emoji: '🍄', name: 'Mushroom', keywords: ['mushroom', 'fungus', 'red', 'white', 'forest', 'spotted'] },
    { emoji: '🧥', name: 'Sweater', keywords: ['sweater', 'warm', 'clothing', 'cozy', 'knit', 'comfortable'] },
    { emoji: '🌳', name: 'Tree', keywords: ['tree', 'green', 'nature', 'tall', 'forest', 'wood'] },
    { emoji: '🐿️', name: 'Squirrel', keywords: ['squirrel', 'brown', 'nut', 'tail', 'forest', 'cute'] },
    { emoji: '🦉', name: 'Owl', keywords: ['owl', 'bird', 'wise', 'night', 'hoot', 'nocturnal'] },

    // General & Symbols
    { emoji: '❤️', name: 'Heart', keywords: ['heart', 'love', 'red', 'emotion', 'romance', 'passion'] },
    { emoji: '💎', name: 'Diamond', keywords: ['diamond', 'gem', 'blue', 'precious', 'jewel', 'sparkle'] },
    { emoji: '⚡', name: 'Lightning', keywords: ['lightning', 'bolt', 'electric', 'yellow', 'power', 'energy'] },
    { emoji: '✨', name: 'Sparkles', keywords: ['sparkles', 'stars', 'magic', 'shiny', 'glitter', 'shine'] },
    { emoji: '🎉', name: 'Party', keywords: ['party', 'celebration', 'confetti', 'fun', 'festive', 'joy'] },
    { emoji: '🏆', name: 'Trophy', keywords: ['trophy', 'award', 'gold', 'winner', 'victory', 'champion'] },
    { emoji: '👑', name: 'Crown', keywords: ['crown', 'king', 'royal', 'gold', 'queen', 'majesty'] },
    { emoji: '💰', name: 'Money', keywords: ['money', 'cash', 'dollar', 'green', 'wealth', 'rich'] },
    { emoji: '', name: 'None', keywords: ['none', 'empty', 'no', 'remove', 'clear', 'delete'] }
  ];

  // Smart search function
  const searchEmojis = (query: string) => {
    if (!query.trim()) return EMOJI_DATABASE;
    
    const searchTerm = query.toLowerCase().trim();
    
    return EMOJI_DATABASE.filter(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      item.keywords.some(keyword => keyword.includes(searchTerm)) ||
      item.emoji.includes(searchTerm)
    );
  };

  // Get filtered results
  const filteredEmojis = useMemo(() => searchEmojis(searchQuery), [searchQuery]);

  // Group by category for display
  const groupedEmojis = useMemo(() => {
    return filteredEmojis.reduce((acc, item) => {
      let category = 'General & Symbols';
      
      if (['🎃', '👻', '💀', '🕷️', '🦇', '🧙‍♀️', '🧹', '🍭', '⚰️', '🔮', '🧟‍♂️', '🧛‍♂️'].includes(item.emoji)) {
        category = 'Halloween & Spooky';
      } else if (['🎄', '🎁', '🎅', '⛄', '🔔', '⭐', '👼', '🦌', '🛷', '🎀', '🔥', '❄️', '🧊', '🥶', '☕', '🧤', '🧣', '🥾', '🎿', '🐧', '🐻‍❄️'].includes(item.emoji)) {
        category = 'Christmas & Winter';
      } else if (['🌸', '🌷', '🌹', '🌻', '🦋', '🐝', '🐞', '🌈', '☀️', '🌧️', '☂️', '🌱'].includes(item.emoji)) {
        category = 'Spring & Nature';
      } else if (['🏖️', '🌴', '🕶️', '🍦', '🍉', '🍋', '🥥', '🩴', '🏊‍♂️', '🏄‍♂️', '⛺'].includes(item.emoji)) {
        category = 'Summer & Beach';
      } else if (['🍂', '🍁', '🍎', '🌰', '🍄', '🧥', '🌳', '🐿️', '🦉'].includes(item.emoji)) {
        category = 'Fall & Harvest';
      }

      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }, [filteredEmojis]);

  // If searching, show all results in one section
  if (searchQuery.trim()) {
    return (
      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          🔍 Search Results ({filteredEmojis.length})
        </h4>
        <div className="flex flex-wrap gap-1">
          {filteredEmojis.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectEmoji(item.emoji)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${
                selectedEmoji === item.emoji 
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' 
                  : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
              title={`${item.name} (${item.keywords.slice(0, 3).join(', ')})`}
            >
              {item.emoji === '' ? (
                <span className="text-gray-400 text-sm">No Icon</span>
              ) : (
                <span className="text-lg">{item.emoji}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show categorized view when not searching
  return (
    <div className="max-h-60 overflow-y-auto space-y-3">
      {Object.entries(groupedEmojis).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-sm font-semibold uppercase text-gray-300 mt-2 mb-1">
            {category}
          </h4>
          <div className="flex flex-wrap gap-1">
            {items.map((item: any, idx: number) => (
              <button
                key={idx}
                onClick={() => onSelectEmoji(item.emoji)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${
                  selectedEmoji === item.emoji 
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' 
                    : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
                title={item.name}
              >
                {item.emoji === '' ? (
                  <span className="text-gray-400 text-sm">No Icon</span>
                ) : (
                  <span className="text-lg">{item.emoji}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

