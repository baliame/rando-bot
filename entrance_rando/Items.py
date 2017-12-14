from BaseClasses import World, Item
import random
import logging


def ItemFactory(items):
    ret = []
    singleton = False
    if isinstance(items, str):
        items = [items]
        singleton = True
    for item in items:
        if item in item_table:
            advancement, priority, type, code, pedestal_hint, pedestal_credit, sickkid_credit, zora_credit, witch_credit, fluteboy_credit = item_table[item]
            ret.append(Item(item, advancement, priority, type, code, pedestal_hint, pedestal_credit, sickkid_credit, zora_credit, witch_credit, fluteboy_credit))
        else:
            logging.getLogger('').warning('Unknown Item: %s' % item)
            return None

    if singleton:
        return ret[0]
    else:
        return ret


# Format: Name: (Advancement, Priority, Type, ItemCode, Pedestal Hint Text, Pedestal Credit Text, Sick Kid Credit Text, Zora Credit Text, Witch Credit Text, Flute Boy Credit Text)
item_table = {'Bow': (True, False, None, 0x0B, 'You have\nchosen the\narcher class.', 'the stick and twine', 'arrow-slinging kid', 'arrow sling for sale', 'witch and robin hood', 'boy shoots again'),
              'Book of Mudora': (True, False, None, 0x1D, 'This is a\nparadox?!', 'and the story book', 'the scholarly kid', 'moon runes for sale', 'drugs for literacy', 'boy can read again'),
              'Hammer': (True, False, None, 0x09, 'stop\nhammer time!', 'and m c hammer', 'hammer-smashing kid', 'm c hammer for sale', 'stop...   hammer time', 'stop, hammer time'),
              'Hookshot': (True, False, None, 0x0A, 'BOING!!!\nBOING!!!\nBOING!!!', 'and the tickle beam', 'tickle-monster kid', 'tickle beam for sale', 'witch and tickle boy', 'boy tickles again'),
              'Magic Mirror': (True, False, None, 0x1A, 'Isn\'t your\nreflection so\npretty?', 'the face reflector', 'the narcissistic kid', 'your face for sale', 'trades looking-glass', 'boy sees himself again'),
              'Ocarina': (True, False, None, 0x14, 'Save the duck\nand fly to\nfreedom!', 'and the duck call', 'the duck-call kid', 'duck call for sale', 'duck-calls for trade', 'ocarina boy plays again'),
              'Pegasus Boots': (True, False, None, 0x4B, 'Gotta go fast!', 'and the sprint shoes', 'the running-man kid', 'sprint shoe for sale', 'shrooms for speed', 'boy runs again'),
              'Power Glove': (True, False, None, 0x1B, 'Now you can\nlift weak\nstuff!', 'and the grey mittens', 'body-building kid', 'lift glove for sale', 'fungus for gloves', 'boy lifts again'),
              'Cape': (True, False, None, 0x19, 'Wear this to\nbecome\ninvisible!', 'the camouflage cape', 'red riding-hood kid', 'red hood for sale', 'hood from a hood', 'boy hides again'),
              'Mushroom': (True, False, None, 0x29, 'I\'m a fun guy!\n\nI\'m a funghi!', 'and the legal drugs', 'the drug-dealing kid', 'legal drugs for sale', 'shroom swap', 'boy sells drugs again'),
              'Shovel': (True, False, None, 0x13, 'Can\n   You\n      Dig it?', 'and the fetch quest', 'archaeologist kid', 'dirt spade for sale', 'can you dig it', 'boy digs again'),
              'Lamp': (True, False, None, 0x12, 'Baby, baby,\nbaby.\nLight my way!', 'and the flashlight', 'light-shining kid', 'flashlight for sale', 'fungus for illumination', 'boy sees at night again'),
              'Magic Powder': (True, False, None, 0x0D, 'you can turn\nanti-faeries\ninto fairies', 'and the magic sack', 'the sack-holding kid', 'magic sack for sale', 'the witch and assistant', 'boy plays marbles again'),
              'Moon Pearl': (True, False, None, 0x1F, '  Bunny Link\n      be\n     gone!', 'and the jaw breaker', 'fortune-telling kid', 'lunar orb for sale', 'shrooms for moon rock', 'boy plays ball again'),
              'Cane of Somaria': (True, False, None, 0x15, 'I make blocks\nto hold down\nswitches!', 'and the red blocks', 'the block-making kid', 'block stick for sale', 'block stick for trade', 'boy makes blocks again'),
              'Fire Rod': (True, False, None, 0x07, 'I\'m the hot\nrod. I make\nthings burn!', 'and the flamethrower', 'fire-starting kid', 'rage rod for sale', 'fungus for rage-rod', 'boy burns again'),
              'Flippers': (True, False, None, 0x1E, 'fancy a swim?', 'and the toewebs', 'the swimming kid', 'finger webs for sale', 'shrooms let you swim', 'boy swims again'),
              'Ice Rod': (True, False, None, 0x08, 'I\'m the cold\nrod. I make\nthings freeze!', 'and the freeze ray', 'the ice-bending kid', 'freeze ray for sale', 'fungus for ice-rod', 'boy freezes again'),
              'Titans Mitts': (True, False, None, 0x1C, 'Now you can\nlift heavy\nstuff!', 'and the golden glove', 'body-building kid', 'carry glove for sale', 'fungus for bling-gloves', 'boy has bling again'),
              'Ether': (True, False, None, 0x10, 'This magic\ncoin freezes\neverything!', 'and the bolt coin', 'coin-collecting kid', 'bolt coin for sale', 'shrooms for bolt-coin', 'boy hides coin again'),
              'Bombos': (True, False, None, 0x0F, 'Burn, baby,\nburn! Fear my\nring of fire!', 'and the swirly coin', 'coin-collecting kid', 'swirly coin for sale', 'shrooms for swirly-coin', 'boy hides coin again'),
              'Quake': (True, False, None, 0x11, 'Maxing out the\nRichter scale\nis what I do!', 'and the wavy coin', 'coin-collecting kid', 'wavy coin for sale', 'shrooms for wavy-coin', 'boy hides coin again'),
              'Bottle': (True, False, None, 0x16, 'Now you can\nstore potions\nand stuff!', 'and the terrarium', 'the terrarium kid', 'terrarium for sale', 'special promotion', 'boy stores things again'),
              'Bottle (Red Potion)': (True, False, None, 0x2B, 'Hearty red goop!', 'and the red goo', 'the liquid kid', 'potion for sale', 'free samples', 'boy drinks again'),
              'Bottle (Green Potion)': (True, False, None, 0x2C, 'Refreshing green goop!', 'and the green goo', 'the liquid kid', 'potion for sale', 'free samples', 'boy drinks again'),
              'Bottle (Blue Potion)': (True, False, None, 0x2D, 'Delicious blue goop!', 'and the blue goo', 'the liquid kid', 'potion for sale', 'free samples', 'boy stores drinks again'),
              'Bottle (Fairy)': (True, False, None, 0x3D, 'Save me and I will revive you', 'and the captive', 'the tingle kid', 'hostage for sale', 'fairy dust and shrooms', 'boy revives again'),
              'Bottle (Bee)': (True, False, None, 0x3C, 'I will sting your foes a few times', 'and the sting buddy', 'the beekeeper kid', 'insect for sale', 'shroom pollenation', 'boy is stung again'),
              'Bottle (Good Bee)': (True, False, None, 0x48, 'I will sting your foes a whole lot!', 'and the sparkle sting', 'the beekeeper kid', 'insect for sale', 'shroom pollenation', 'boy is stung again'),
              'Master Sword': (True, False, None, 0x50, 'I beat barries and pigs alike', 'and the master sword', 'sword-wielding kid', 'glow sword for sale', 'fungus for blue slasher', 'boy fights again'),
              'Tempered Sword': (True, False, None, 0x02, 'I stole the\nblacksmith\'s\njob!', 'the tempered sword', 'sword-wielding kid', 'flame sword for sale', 'fungus for red slasher', 'boy fights again'),
              'Fighter Sword': (True, False, None, 0x49, 'A pathetic\nsword rests\nhere!', 'the tiny sword', 'sword-wielding kid', 'tiny sword for sale', 'fungus for tiny slasher', 'boy fights again'),
              'Golden Sword': (True, False, None, 0x03, 'The butter\nsword rests\nhere!', 'and the butter sword', 'sword-wielding kid', 'butter for sale', 'cap churned to butter', 'boy fights again'),
              'Progressive Sword': (True, False, None, 0x5E, 'a better copy\nof your sword\nfor your time', 'the unknown sword', 'sword-wielding kid', 'sword for sale', 'fungus for some slasher', 'boy fights again'),
              'Progressive Glove': (True, False, None, 0x61, 'a way to lift\nheavier things', 'and the lift upgrade', 'body-building kid', 'some glove for sale', 'fungus for gloves', 'boy lifts again'),
              'Silver Arrows': (True, False, None, 0x58, 'Do you fancy\nsilver tipped\narrows?', 'and the ganonsbane', 'ganon-killing kid', 'ganon doom for sale', 'fungus for pork', 'boy eats pork chops'),
              'Green Pendant': (True, False, 'Crystal', [0x04, 0x38, 0x62, 0x00, 0x69, 0x01], None, None, None, None, None, None),
              'Red Pendant': (True, False, 'Crystal', [0x02, 0x34, 0x60, 0x00, 0x69, 0x02], None, None, None, None, None, None),
              'Blue Pendant': (True, False, 'Crystal', [0x01, 0x32, 0x60, 0x00, 0x69, 0x03], None, None, None, None, None, None),
              'Triforce': (True, False, None, 0x6A, '\n   YOU WIN!', 'and the triforce', 'victorious kid', 'victory for sale', 'fungus for the win', 'boy wins again'),
              'Power Star': (True, False, None, 0x6B, 'a small victory', 'and the power star', 'star-struck kid', 'star for sale', 'see stars with shroom', 'boy sees stars again'),
              'Triforce Piece': (True, False, None, 0x6C, 'a small victory', 'and the thirdforce', 'triangular kid', 'triangle for sale', 'fungus for triangle', 'boy triangulates again'),
              'Crystal 1': (True, False, 'Crystal', [0x02, 0x34, 0x64, 0x40, 0x7F, 0x06], None, None, None, None, None, None),
              'Crystal 2': (True, False, 'Crystal', [0x10, 0x34, 0x64, 0x40, 0x79, 0x06], None, None, None, None, None, None),
              'Crystal 3': (True, False, 'Crystal', [0x40, 0x34, 0x64, 0x40, 0x6C, 0x06], None, None, None, None, None, None),
              'Crystal 4': (True, False, 'Crystal', [0x20, 0x34, 0x64, 0x40, 0x6D, 0x06], None, None, None, None, None, None),
              'Crystal 5': (True, False, 'Crystal', [0x04, 0x32, 0x64, 0x40, 0x6E, 0x06], None, None, None, None, None, None),
              'Crystal 6': (True, False, 'Crystal', [0x01, 0x32, 0x64, 0x40, 0x6F, 0x06], None, None, None, None, None, None),
              'Crystal 7': (True, False, 'Crystal', [0x08, 0x34, 0x64, 0x40, 0x7C, 0x06], None, None, None, None, None, None),
              'Single Arrow': (False, False, None, 0x43, 'a lonely arrow\nsits here.', 'and the arrow', 'stick-collecting kid', 'sewing kit for sale', 'fungus for arrow', 'boy sews again'),
              'Arrows (10)': (False, False, None, 0x44, 'This will give\nyou ten shots\nwith your bow!', 'and the arrow pack', 'stick-collecting kid', 'sewing kit for sale', 'fungus for arrows', 'boy sews again'),
              'Arrow Upgrade (+10)': (False, False, None, 0x54, 'increase arrow\nstorage, low\nlow price', 'and the quiver', 'quiver-enlarging kid', 'arrow boost for sale', 'witch and more skewers', 'boy sews more again'),
              'Arrow Upgrade (+5)': (False, False, None, 0x53, 'increase arrow\nstorage, low\nlow price', 'and the quiver', 'quiver-enlarging kid', 'arrow boost for sale', 'witch and more skewers', 'boy sews more again'),
              'Single Bomb': (False, False, None, 0x27, 'I make things\ngo BOOM! But\njust once.', 'and the explosion', 'the bomb-holding kid', 'firecracker for sale', 'blend fungus into bomb', 'boy explodes again'),
              'Bombs (3)': (False, False, None, 0x28, 'I make things\ngo triple\nBOOM!!!', 'and the explosions', 'the bomb-holding kid', 'firecrackers for sale', 'blend fungus into bombs', 'boy explodes again'),
              'Bomb Upgrade (+10)': (False, False, None, 0x52, 'increase bomb\nstorage, low\nlow price', 'and the bomb bag', 'boom-enlarging kid', 'bomb boost for sale', 'the shroom goes boom', 'boy explodes more again'),
              'Bomb Upgrade (+5)': (False, False, None, 0x51, 'increase bomb\nstorage, low\nlow price', 'and the bomb bag', 'boom-enlarging kid', 'bomb boost for sale', 'the shroom goes boom', 'boy explodes more again'),
              'Blue Mail': (False, True, None, 0x22, 'Now you\'re a\nblue elf!', 'and the banana hat', 'the protected kid', 'banana hat for sale', 'the clothing store', 'boy fears little again'),
              'Red Mail': (False, True, None, 0x23, 'Now you\'re a\nred elf!', 'and the eggplant hat', 'well-protected kid', 'purple hat for sale', 'the nice clothing store', 'boy fears nothing again'),
              'Progressive Armor': (False, True, None, 0x60, 'time for a\nchange of\nclothes?', 'and the unknown hat', 'the protected kid', 'new hat for sale', 'the clothing store', 'boy fears less again'),
              'Blue Boomerang': (False, True, None, 0x0C, 'No matter what\nyou do, blue\nreturns to you', 'and the bluemarang', 'the bat-throwing kid', 'bent stick for sale', 'fungus for puma-stick', 'boy plays fetch again'),
              'Red Boomerang': (False, True, None, 0x2A, 'No matter what\nyou do, red\nreturns to you', 'and the badmarang', 'the bat-throwing kid', 'air foil for sale', 'fungus for return-stick', 'boy plays fetch again'),
              'Blue Shield': (False, True, None, 0x04, 'Now you can\ndefend against\npebbles!', 'and the stone blocker', 'shield-wielding kid', 'shield for sale', 'fungus for shield', 'boy defends again'),
              'Red Shield': (False, True, None, 0x05, 'Now you can\ndefend against\nfireballs!', 'and the shot blocker', 'shield-wielding kid', 'fire shield for sale', 'fungus for fire shield', 'boy defends again'),
              'Mirror Shield': (True, False, None, 0x06, 'Now you can\ndefend against\nlasers!', 'and the laser blocker', 'shield-wielding kid', 'face shield for sale', 'fungus for face shield', 'boy defends again'),
              'Progressive Shield': (True, False, None, 0x5F, 'have a better\nblocker in\nfront of you', 'and the new shield', 'shield-wielding kid', 'shield for sale', 'fungus for shield', 'boy defends again'),
              'Bug Catching Net': (True, False, None, 0x21, 'Let\'s catch\nsome bees and\nfaeries!', 'and the bee catcher', 'the bug-catching kid', 'stick web for sale', 'fungus for butterflies', 'boy catches bees again'),
              'Cane of Byrna': (True, False, None, 0x18, 'Use this to\nbecome\ninvincible!', 'and the bad cane', 'the spark-making kid', 'spark stick for sale', 'spark-stick for trade', 'boy encircles again'),
              'Boss Heart Container': (False, False, None, 0x3E, 'Maximum health\nincreased!\nYeah!', 'and the full heart', 'the life-giving kid', 'love for sale', 'fungus for life', 'boy feels love again'),
              'Sanctuary Heart Container': (False, False, None, 0x3F, 'Maximum health\nincreased!\nYeah!', 'and the full heart', 'the life-giving kid', 'love for sale', 'fungus for life', 'boy feels love again'),
              'Piece of Heart': (False, False, None, 0x17, 'Just a little\npiece of love!', 'and the broken heart', 'the life-giving kid', 'little love for sale', 'fungus for life', 'boy feels love again'),
              'Rupee (1)': (False, False, None, 0x34, 'Just pocket\nchange. Move\nright along.', 'the pocket change', 'poverty-struck kid', 'life lesson for sale', 'buying cheap drugs', 'boy has snack again'),
              'Rupees (5)': (False, False, None, 0x35, 'Just pocket\nchange. Move\nright along.', 'the pocket change', 'poverty-struck kid', 'life lesson for sale', 'buying cheap drugs', 'boy has snack again'),
              'Rupees (20)': (False, False, None, 0x36, 'Just couch\ncash. Move\nright along.', 'and the couch cash', 'the piggy-bank kid', 'life lesson for sale', 'the witch buying drugs', 'boy has lunch again'),
              'Rupees (50)': (False, False, None, 0x41, 'A rupee pile!\nOkay?', 'and the rupee pile', 'the well-off kid', 'life lesson for sale', 'buying okay drugs', 'boy has dinner again'),
              'Rupees (100)': (False, False, None, 0x40, 'A rupee stash!\nHell yeah!', 'and the rupee stash', 'the kind-of-rich kid', 'life lesson for sale', 'buying good drugs', 'boy has buffet again'),
              'Rupees (300)': (False, False, None, 0x46, 'A rupee hoard!\nHell yeah!', 'and the rupee hoard', 'the really-rich kid', 'life lesson for sale', 'buying the best drugs', 'boy is rich again'),
              'Rupoor': (False, False, None, 0x59, 'a debt collector', 'and the toll-booth', 'the toll-booth kid', 'double loss for sale', 'witch stole your rupees', 'boy steals rupees again'),
              'Red Clock': (False, True, None, 0x5B, 'a waste of time', 'the ruby clock', 'the ruby-time kid', 'red time for sale', 'for ruby time', 'boy adjusts time again'),
              'Blue Clock': (False, True, None, 0x5C, 'a bit of time', 'the sapphire clock', 'sapphire-time kid', 'blue time for sale', 'for sapphire time', 'boy adjusts time again'),
              'Green Clock': (False, True, None, 0x5D, 'a lot of time', 'the emerald clock', 'the emerald-time kid', 'green time for sale', 'for emerald time', 'boy adjusts time again'),
              'Single RNG': (False, True, None, 0x62, 'something you don\'t yet have', None, None, None, None, None),
              'Multi RNG': (False, True, None, 0x63, 'something you may already have', None, None, None, None, None),
              'Magic Upgrade (1/2)': (True, False, None, 0x4E, 'Your magic\npower has been\ndoubled!', 'and the spell power', 'the magic-saving kid', 'wizardry for sale', 'mekalekahi mekahiney ho', 'boy saves magic again'),  # can be required to beat mothula in an open seed in very very rare circumstance
              'Magic Upgrade (1/4)': (True, False, None, 0x4F, 'Your magic\npower has been\nquadrupled!', 'and the spell power', 'the magic-saving kid', 'wizardry for sale', 'mekalekahi mekahiney ho', 'boy saves magic again'),  # can be required to beat mothula in an open seed in very very rare circumstance
              'Small Key (Eastern Palace)': (False, False, 'SmallKey', 0xA2, 'A small key to Armos Knights', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Eastern Palace)': (False, False, 'BigKey', 0x9D, 'A big key to Armos Knights', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Eastern Palace)': (False, True, 'Compass', 0x8D, 'Now you can find the Armos Knights!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Eastern Palace)': (False, True, 'Map', 0x7D, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Desert Palace)': (False, False, 'SmallKey', 0xA3, 'A small key to the desert', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Desert Palace)': (False, False, 'BigKey', 0x9C, 'A big key to the desert', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Desert Palace)': (False, True, 'Compass', 0x8C, 'Now you can find Lanmolas!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Desert Palace)': (False, True, 'Map', 0x7C, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Tower of Hera)': (False, False, 'SmallKey', 0xAA, 'A small key to Hera', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Tower of Hera)': (False, False, 'BigKey', 0x95, 'A big key to Hera', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Tower of Hera)': (False, True, 'Compass', 0x85, 'Now you can find Moldorm!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Tower of Hera)': (False, True, 'Map', 0x75, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Escape)': (False, False, 'SmallKey', 0xA0, 'A small key to the castle', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Escape)': (False, False, 'BigKey', 0x9F, 'A big key to the castle', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Escape)': (False, True, 'Compass', 0x8F, 'Now you can find no boss!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Escape)': (False, True, 'Map', 0x7F, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Agahnims Tower)': (False, False, 'SmallKey', 0xA4, 'A small key to Agahnim', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Small Key (Palace of Darkness)': (False, False, 'SmallKey', 0xA6, 'A small key to darkness', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Palace of Darkness)': (False, False, 'BigKey', 0x99, 'A big key to darkness', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Palace of Darkness)': (False, True, 'Compass', 0x89, 'Now you can find Helmasaur King!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Palace of Darkness)': (False, True, 'Map', 0x79, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Thieves Town)': (False, False, 'SmallKey', 0xAB, 'A small key to thievery', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Thieves Town)': (False, False, 'BigKey', 0x94, 'A big key to thievery', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Thieves Town)': (False, True, 'Compass', 0x84, 'Now you can find Blind!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Thieves Town)': (False, True, 'Map', 0x74, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Skull Woods)': (False, False, 'SmallKey', 0xA8, 'A small key to the woods', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Skull Woods)': (False, False, 'BigKey', 0x97, 'A big key to the woods', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Skull Woods)': (False, True, 'Compass', 0x87, 'Now you can find Mothula!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Skull Woods)': (False, True, 'Map', 0x77, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Swamp Palace)': (False, False, 'SmallKey', 0xA5, 'A small key to the swamp', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Swamp Palace)': (False, False, 'BigKey', 0x9A, 'A big key to the swamp', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Swamp Palace)': (False, True, 'Compass', 0x8A, 'Now you can find Arrghus!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Swamp Palace)': (False, True, 'Map', 0x7A, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Ice Palace)': (False, False, 'SmallKey', 0xA9, 'A small key to the iceberg', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Ice Palace)': (False, False, 'BigKey', 0x96, 'A big key to the iceberg', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Ice Palace)': (False, True, 'Compass', 0x86, 'Now you can find Kholdstare!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Ice Palace)': (False, True, 'Map', 0x76, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Misery Mire)': (False, False, 'SmallKey', 0xA7, 'A small key to the mire', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Misery Mire)': (False, False, 'BigKey', 0x98, 'A big key to the mire', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Misery Mire)': (False, True, 'Compass', 0x88, 'Now you can find Vitreous!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Misery Mire)': (False, True, 'Map', 0x78, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Turtle Rock)': (False, False, 'SmallKey', 0xAC, 'A small key to the pipe maze', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Turtle Rock)': (False, False, 'BigKey', 0x93, 'A big key to the pipe maze', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Turtle Rock)': (False, True, 'Compass', 0x83, 'Now you can find Trinexx!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Turtle Rock)': (False, True, 'Map', 0x73, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Small Key (Ganons Tower)': (False, False, 'SmallKey', 0xAD, 'A small key to the evil tower', 'and the key', 'the unlocking kid', 'keys for sale', 'unlock the fungus', 'boy opens door again'),
              'Big Key (Ganons Tower)': (False, False, 'BigKey', 0x92, 'A big key to the evil tower', 'and the big key', 'the big-unlock kid', 'big key for sale', 'face key fungus', 'boy opens chest again'),
              'Compass (Ganons Tower)': (False, True, 'Compass', 0x82, 'Now you can find Agahnim!', 'and the compass', 'the magnetic kid', 'compass for sale', 'magnetic fungus', 'boy points north again'),
              'Map (Ganons Tower)': (False, True, 'Map', 0x72, 'A tightly folded map rests here', 'and the map', 'cartography kid', 'map for sale', 'a map to shrooms', 'boy draws again'),
              'Nothing': (False, False, None, 0x5A, 'Some Hot Air', 'and the Nothing', 'the zen kid', 'outright theft', 'shroom theft', 'boy is bored again'),
              'Beat Agahnim 1': (True, False, 'Event', None, None, None, None, None, None, None),
              'Beat Agahnim 2': (True, False, 'Event', None, None, None, None, None, None, None)}