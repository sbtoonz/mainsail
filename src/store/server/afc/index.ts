import { Module } from 'vuex';
import { AFCRoot } from './types'; // Import Root type from types.ts

// Define the initial state
const state: AFCRoot = {
    result: {
        eventtime: 0,
        status: {
            AFC: {},
        },
    },
};

export const AFC: Module<AFCRoot, any> = {
    namespaced: true,
    state,
};

export { state };
export * from './types';
