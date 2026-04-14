import { commands, type CommandResult } from './commands';

export function execute(cmd: string, outputFn: (text: string) => void) {
  let sudo = false;
  let parts = cmd.split(' ');
  if (parts[0] === 'sudo') {
    sudo = true;
    parts.shift();
  }
  
  const [command, ...rest] = parts;
  const arg = rest.join(' ');
  const handler = commands[command as keyof typeof commands];
  if (handler) {
    const result: CommandResult = handler(arg, sudo);
    if (result.output) outputFn(result.output);
    if (result.error) outputFn(result.error);
  } else {
    outputFn(`Unknown command: ${command}`);
  }
}