// Main orchestrator machine
import { supamotoMachine } from "./supamoto/parentMachine.js";

// Information machines
import { knowMoreMachine } from "./supamoto/information/knowMoreMachine.js";

// Account management machines
import { accountMenuMachine } from "./supamoto/account-menu/accountMenuMachine.js";
import { loginMachine } from "./supamoto/account-login/loginMachine.js";
import { accountCreationMachine } from "./supamoto/account-creation/accountCreationMachine.js";

export type StateMachine = typeof supamotoMachine;

export function getStateMachine(): StateMachine {
  return supamotoMachine;
}

// Export available machines
export {
  supamotoMachine,
  knowMoreMachine,
  accountMenuMachine,
  loginMachine,
  accountCreationMachine,
};
