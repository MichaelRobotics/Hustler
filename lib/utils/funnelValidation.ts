import { FunnelFlow, FunnelStage, FunnelBlock, FunnelBlockOption } from '../types/funnel';

/**
 * Validates if a value is a valid string
 */
const isValidString = (value: any): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Validates if a value is a valid array
 */
const isValidArray = (value: any): value is any[] => {
  return Array.isArray(value) && value.length > 0;
};

/**
 * Validates a FunnelBlockOption
 */
const validateFunnelBlockOption = (option: any): FunnelBlockOption | null => {
  if (!option || typeof option !== 'object') return null;
  
  const text = option.text;
  const nextBlockId = option.nextBlockId;
  
  if (!isValidString(text)) return null;
  
  // nextBlockId can be string or null
  if (nextBlockId !== null && !isValidString(nextBlockId)) return null;
  
  return { text, nextBlockId };
};

/**
 * Validates a FunnelBlock
 */
const validateFunnelBlock = (block: any): FunnelBlock | null => {
  if (!block || typeof block !== 'object') return null;
  
  const id = block.id;
  const message = block.message;
  const options = block.options;
  
  if (!isValidString(id)) return null;
  if (!isValidString(message)) return null;
  if (!isValidArray(options)) return null;
  
  const validatedOptions = options
    .map(validateFunnelBlockOption)
    .filter((opt): opt is FunnelBlockOption => opt !== null);
  
  if (validatedOptions.length === 0) return null;
  
  return { id, message, options: validatedOptions };
};

/**
 * Validates a FunnelStage
 */
const validateFunnelStage = (stage: any): FunnelStage | null => {
  if (!stage || typeof stage !== 'object') return null;
  
  const id = stage.id;
  const name = stage.name;
  const explanation = stage.explanation;
  const blockIds = stage.blockIds;
  
  if (!isValidString(id)) return null;
  if (!isValidString(name)) return null;
  if (!isValidString(explanation)) return null;
  if (!isValidArray(blockIds)) return null;
  
  // Validate that all blockIds are strings
  const validBlockIds = blockIds.filter((id: any) => isValidString(id));
  if (validBlockIds.length === 0) return null;
  
  return { id, name, explanation, blockIds: validBlockIds };
};

/**
 * Validates and repairs a FunnelFlow object
 */
export const validateAndRepairFunnelFlow = (data: any): FunnelFlow | null => {
  if (!data || typeof data !== 'object') return null;
  
  const startBlockId = data.startBlockId;
  const stages = data.stages;
  const blocks = data.blocks;
  
  // Validate startBlockId
  if (!isValidString(startBlockId)) return null;
  
  // Validate stages
  if (!isValidArray(stages)) return null;
  
  const validatedStages = stages
    .map(validateFunnelStage)
    .filter((stage): stage is FunnelStage => stage !== null);
  
  if (validatedStages.length === 0) return null;
  
  // Validate blocks
  if (!blocks || typeof blocks !== 'object') return null;
  
  const validatedBlocks: Record<string, FunnelBlock> = {};
  const allBlockIds = new Set<string>();
  
  // Validate each block
  for (const [blockId, block] of Object.entries(blocks)) {
    const validatedBlock = validateFunnelBlock(block);
    if (validatedBlock) {
      validatedBlocks[blockId] = validatedBlock;
      allBlockIds.add(blockId);
    }
  }
  
  if (Object.keys(validatedBlocks).length === 0) return null;
  
  // Validate that startBlockId exists in blocks
  if (!allBlockIds.has(startBlockId)) return null;
  
  // Validate that all stage.blockIds reference existing blocks
  const validStages = validatedStages.filter(stage => 
    stage.blockIds.every(blockId => allBlockIds.has(blockId))
  );
  
  if (validStages.length === 0) return null;
  
  // Validate that all block.nextBlockId references are valid
  const validBlocks: Record<string, FunnelBlock> = {};
  for (const [blockId, block] of Object.entries(validatedBlocks)) {
    const validOptions = block.options.filter(option => 
      option.nextBlockId === null || allBlockIds.has(option.nextBlockId)
    );
    
    if (validOptions.length > 0) {
      validBlocks[blockId] = { ...block, options: validOptions };
    }
  }
  
  if (Object.keys(validBlocks).length === 0) return null;
  
  return {
    startBlockId,
    stages: validStages,
    blocks: validBlocks
  };
};

/**
 * Creates a minimal valid funnel flow for error cases
 */
export const createMinimalValidFunnelFlow = (): FunnelFlow => ({
  startBlockId: 'error_start',
  stages: [
    {
      id: 'stage-error',
      name: 'ERROR',
      explanation: 'Generation failed. Please try again.',
      blockIds: ['error_start']
    }
  ],
  blocks: {
    'error_start': {
      id: 'error_start',
      message: 'An error occurred during funnel generation. Please check the error message above and try again.',
      options: []
    }
  }
});

/**
 * Validates if a funnel flow has the minimum required structure
 */
export const hasMinimumFunnelStructure = (flow: FunnelFlow): boolean => {
  if (!flow || !flow.stages || !flow.blocks) return false;
  
  // Must have at least one stage
  if (flow.stages.length === 0) return false;
  
  // Must have at least one block
  if (Object.keys(flow.blocks).length === 0) return false;
  
  // Start block must exist
  if (!flow.blocks[flow.startBlockId]) return false;
  
  return true;
};
