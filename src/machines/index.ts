// Main orchestrator machine
import { exampleMachine } from "./example/parentMachine.js";

// Information machines
import { knowMoreMachine } from "./example/information/knowMoreMachine.js";

// Account management machines
import { accountMenuMachine } from "./example/account-menu/accountMenuMachine.js";
import { loginMachine } from "./example/account-login/loginMachine.js";
import { accountCreationMachine } from "./example/account-creation/accountCreationMachine.js";

export type StateMachine = typeof exampleMachine;

export function getStateMachine(): StateMachine {
  return exampleMachine;
}

// Export available machines
export {
  exampleMachine,
  knowMoreMachine,
  accountMenuMachine,
  loginMachine,
  accountCreationMachine,
};
