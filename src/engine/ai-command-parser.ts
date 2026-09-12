// ai-command-parser.ts — Parses AI responses into executable actions
// Enables AI to spawn 3D objects, trigger gestures, run tutorials, etc.

export type CommandType =
  | 'spawn_object'
  | 'clear_objects'
  | 'throw_objects'
  | 'reset_objects'
  | 'start_tutorial'
  | 'highlight_area'
  | 'show_arrow'
  | 'set_camera'
  | 'create_gesture'
  | 'run_code'
  | 'speak'
  | 'wait'
  | 'navigate'
  | 'set_threshold'
  | 'start_recording'
  | 'stop_recording';

export interface AICommand {
  type: CommandType;
  params: Record<string, any>;
  description: string;
  delay?: number; // ms delay before execution
}

export interface ParsedResponse {
  text: string;           // Display text for chat
  commands: AICommand[];  // Actions to execute
  tutorial?: TutorialStep; // Optional guided step
}

export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  highlight?: { x: number; y: number; width: number; height: number };
  arrow?: { from: { x: number; y: number }; to: { x: number; y: number } };
  expectedAction?: string; // What user should do
  onComplete?: string;     // Next step ID
}

// Parse AI response text for embedded commands
export function parseAIResponse(text: string): ParsedResponse {
  const commands: AICommand[] = [];
  let cleanText = text;

  // Pattern: [ACTION: type, param1: value1, param2: value2]
  const actionRegex = /\[ACTION:\s*([^\]]+)\]/g;
  let match;

  while ((match = actionRegex.exec(text)) !== null) {
    const actionStr = match[1];
    const command = parseCommand(actionStr);
    if (command) {
      commands.push(command);
    }
    cleanText = cleanText.replace(match[0], '').trim();
  }

  // Pattern: [TUTORIAL: id, title, instruction]
  const tutorialRegex = /\[TUTORIAL:\s*([^\]]+)\]/g;
  let tutorial: TutorialStep | undefined;

  while ((match = tutorialRegex.exec(text)) !== null) {
    tutorial = parseTutorial(match[1]);
    cleanText = cleanText.replace(match[0], '').trim();
  }

  return {
    text: cleanText,
    commands,
    tutorial,
  };
}

function parseCommand(actionStr: string): AICommand | null {
  const parts = actionStr.split(',').map(p => p.trim());
  const type = parts[0] as CommandType;
  const params: Record<string, any> = {};

  for (let i = 1; i < parts.length; i++) {
    const [key, ...valueParts] = parts[i].split(':');
    const value = valueParts.join(':').trim();
    
    // Try to parse as number
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue.toString() === value) {
      params[key.trim()] = numValue;
    } else {
      params[key.trim()] = value;
    }
  }

  const descriptions: Record<CommandType, string> = {
    spawn_object: `Spawning ${params.shape || 'object'}...`,
    clear_objects: 'Clearing all objects...',
    throw_objects: 'Throwing objects!',
    reset_objects: 'Resetting positions...',
    start_tutorial: `Starting tutorial: ${params.topic || 'general'}`,
    highlight_area: 'Highlighting area...',
    show_arrow: 'Showing direction...',
    set_camera: 'Adjusting camera...',
    create_gesture: `Creating gesture: ${params.name || 'custom'}`,
    run_code: 'Executing code...',
    speak: 'Speaking...',
    wait: `Waiting ${params.ms || 1000}ms...`,
    navigate: `Navigating to ${params.view || 'live'}...`,
    set_threshold: `Setting ${params.name} to ${params.value}`,
    start_recording: 'Starting recording...',
    stop_recording: 'Stopping recording...',
  };

  return {
    type,
    params,
    description: descriptions[type] || 'Executing action...',
    delay: params.delay ? Number(params.delay) : undefined,
  };
}

function parseTutorial(tutorialStr: string): TutorialStep {
  const parts = tutorialStr.split(',').map(p => p.trim());
  return {
    id: parts[0] || 'step-1',
    title: parts[1] || 'Tutorial Step',
    instruction: parts[2] || 'Follow the instructions',
    expectedAction: parts[3],
    onComplete: parts[4],
  };
}

// Generate AI response with commands for common requests
export function generateCommandResponse(userMessage: string): ParsedResponse {
  const lower = userMessage.toLowerCase();

  // Spawn objects
  if (lower.includes('create') && (lower.includes('cube') || lower.includes('box'))) {
    return {
      text: "I'll create a cube for you right now! Watch it appear in your viewport.",
      commands: [
        { type: 'spawn_object', params: { shape: 'cube', color: '#8ff0e4' }, description: 'Spawning cube...' },
        { type: 'speak', params: { text: 'Cube created!' }, description: 'Speaking...' },
      ],
    };
  }

  if (lower.includes('create') && lower.includes('sphere')) {
    return {
      text: "Here's a shiny sphere for you!",
      commands: [
        { type: 'spawn_object', params: { shape: 'sphere', color: '#6fe5d6' }, description: 'Spawning sphere...' },
        { type: 'speak', params: { text: 'Sphere created!' }, description: 'Speaking...' },
      ],
    };
  }

  if (lower.includes('create') && lower.includes('torus') || lower.includes('ring')) {
    return {
      text: "Creating a golden torus ring!",
      commands: [
        { type: 'spawn_object', params: { shape: 'torus', color: '#ffd700' }, description: 'Spawning torus...' },
      ],
    };
  }

  if (lower.includes('create') && (lower.includes('object') || lower.includes('something'))) {
    return {
      text: "I'll create a variety of objects for you to play with!",
      commands: [
        { type: 'spawn_object', params: { shape: 'cube' }, description: 'Spawning cube...', delay: 0 },
        { type: 'spawn_object', params: { shape: 'sphere' }, description: 'Spawning sphere...', delay: 300 },
        { type: 'spawn_object', params: { shape: 'torus' }, description: 'Spawning torus...', delay: 600 },
        { type: 'speak', params: { text: 'Three objects created! Try throwing them.' }, description: 'Speaking...', delay: 900 },
      ],
    };
  }

  // Clear/reset
  if (lower.includes('clear') || lower.includes('remove all')) {
    return {
      text: "Clearing all objects from the scene.",
      commands: [
        { type: 'clear_objects', params: {}, description: 'Clearing objects...' },
      ],
    };
  }

  if (lower.includes('throw') || lower.includes('launch') || lower.includes('toss')) {
    return {
      text: "Throwing all objects into the air!",
      commands: [
        { type: 'throw_objects', params: {}, description: 'Throwing objects...' },
        { type: 'speak', params: { text: 'Wheee!' }, description: 'Speaking...' },
      ],
    };
  }

  // Tutorial requests
  if (lower.includes('teach') || lower.includes('how do i') || lower.includes('walk me through') || lower.includes('guide')) {
    if (lower.includes('pinch')) {
      return {
        text: "Let me walk you through the pinch gesture step by step!\n\n1. Hold your hand up in front of the camera\n2. Bring your thumb and index finger together slowly\n3. Watch the confidence ring fill up\n4. When it's full, you've pinched!\n\nTry it now — I'll give you visual feedback.",
        commands: [
          { type: 'start_tutorial', params: { topic: 'pinch' }, description: 'Starting pinch tutorial...' },
          { type: 'speak', params: { text: 'Bring your thumb and index finger together slowly.' }, description: 'Speaking...' },
        ],
        tutorial: {
          id: 'pinch-1',
          title: 'Pinch Gesture Tutorial',
          instruction: 'Hold your hand up and bring thumb and index finger together',
          expectedAction: 'pinch',
          onComplete: 'pinch-2',
        },
      };
    }

    if (lower.includes('3d') || lower.includes('object')) {
      return {
        text: "Let me show you how to use 3D objects!\n\n1. Click the ⬡ 3D Objects button in the top-right\n2. Choose an object type (Cube, Sphere, or Torus)\n3. Watch it appear with physics!\n4. Use Throw All to launch them\n\nLet me create some objects for you to practice with.",
        commands: [
          { type: 'spawn_object', params: { shape: 'cube' }, description: 'Spawning cube...', delay: 500 },
          { type: 'spawn_object', params: { shape: 'sphere' }, description: 'Spawning sphere...', delay: 1000 },
          { type: 'highlight_area', params: { x: 90, y: 5, width: 15, height: 8 }, description: 'Highlighting button...' },
          { type: 'speak', params: { text: 'I created some objects for you. Click the 3D Objects button to see controls.' }, description: 'Speaking...', delay: 1500 },
        ],
      };
    }

    return {
      text: "I'd love to help! Here's what I can teach you:\n\n• **Pinch gesture** — Say 'teach me to pinch'\n• **3D objects** — Say 'teach me 3D objects'\n• **Custom gestures** — Say 'help me create a gesture'\n• **Threshold tuning** — Say 'help me tune thresholds'\n\nWhat would you like to learn?",
      commands: [
        { type: 'speak', params: { text: 'What would you like to learn?' }, description: 'Speaking...' },
      ],
    };
  }

  // Gesture creation
  if (lower.includes('create') && lower.includes('gesture') || lower.includes('make') && lower.includes('gesture')) {
    const gestureName = extractName(userMessage) || 'CUSTOM-GESTURE';
    return {
      text: `Let's create a new gesture called **${gestureName}**!\n\nHere's the detection code I've generated:\n\n\`\`\`javascript\nfunction detect${gestureName.replace(/-/g, '')}(landmarks) {\n  const extCount = extFingers(landmarks);\n  const palmAngle = palmOrientation(landmarks);\n  \n  return {\n    active: extCount >= 4 && palmAngle > 30,\n    confidence: Math.min(palmAngle / 60, 1.0),\n  };\n}\n\`\`\`\n\nI've added this to your gesture library! Switch to Edit view to customize it.`,
      commands: [
        { type: 'create_gesture', params: { name: gestureName, type: 'custom' }, description: 'Creating gesture...' },
        { type: 'speak', params: { text: `Gesture ${gestureName} created! Check your library.` }, description: 'Speaking...' },
      ],
    };
  }

  // Navigation
  if (lower.includes('show me') && lower.includes('3d')) {
    return {
      text: "Switching to the 3D view for you!",
      commands: [
        { type: 'navigate', params: { view: '3d' }, description: 'Navigating...' },
      ],
    };
  }

  if (lower.includes('show me') && lower.includes('edit')) {
    return {
      text: "Opening the code editor!",
      commands: [
        { type: 'navigate', params: { view: 'edit' }, description: 'Navigating...' },
      ],
    };
  }

  // Default
  return {
    text: `I understand you're asking: "${userMessage}"\n\nI can help you with:\n• **Create objects** — "Create a cube", "Add a sphere"\n• **Control objects** — "Throw all", "Clear objects"\n• **Tutorials** — "Teach me to pinch", "How do I use 3D?"\n• **Create gestures** — "Create a wave gesture"\n• **Navigate** — "Show me 3D", "Go to edit"\n\nJust tell me what you'd like to do!`,
    commands: [],
  };
}

function extractName(message: string): string | null {
  const match = message.match(/(?:called|named)\s+["']?([^"'\s]+)["']?/i);
  return match ? match[1].toUpperCase().replace(/\s+/g, '-') : null;
}
