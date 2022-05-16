import LevelDataType from './levelDataType';

const levelDataTypeToString: {[levelDataType: string]: string} = {};

levelDataTypeToString[LevelDataType.Default] = 'Default';
levelDataTypeToString[LevelDataType.Wall] = 'Wall';
levelDataTypeToString[LevelDataType.Block] = 'Block';
levelDataTypeToString[LevelDataType.End] = 'End';
levelDataTypeToString[LevelDataType.Start] = 'Start';
levelDataTypeToString[LevelDataType.Hole] = 'Hole';
levelDataTypeToString[LevelDataType.Left] = 'Left';
levelDataTypeToString[LevelDataType.Up] = 'Up';
levelDataTypeToString[LevelDataType.Right] = 'Right';
levelDataTypeToString[LevelDataType.Down] = 'Down';
levelDataTypeToString[LevelDataType.Upleft] = 'Upleft';
levelDataTypeToString[LevelDataType.Upright] = 'Upright';
levelDataTypeToString[LevelDataType.Downright] = 'Downright';
levelDataTypeToString[LevelDataType.Downleft] = 'Downleft';

export default levelDataTypeToString;
