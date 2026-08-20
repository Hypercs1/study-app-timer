// Jest setup — runs before each test file (see "jest.setupFiles" in package.json).
//
// Replace AsyncStorage with the official in-memory mock so storage tests exercise
// real read/modify/write behavior without a native module. Individual tests call
// AsyncStorage.clear() in beforeEach to stay isolated.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
