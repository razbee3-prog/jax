import { defineMemory, memoryLayer } from "managed-deepagents";

export const memory = defineMemory({ user: memoryLayer({ allow: () => true }) });
