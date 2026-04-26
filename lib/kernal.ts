import { commands, type CommandResult } from './commands.ts';

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
    const result = handler(arg, sudo);
    
    // Handle async results (Promises)
    if (result instanceof Promise) {
      result.then((res: CommandResult) => {
        if (res.output) outputFn(res.output);
        if (res.error) outputFn(res.error);
      }).catch((err: Error) => {
        outputFn(`Error: ${err.message}`);
      });
    } else {
      const syncResult = result as CommandResult;
      if (syncResult.output) outputFn(syncResult.output);
      if (syncResult.error) outputFn(syncResult.error);
    }
  } else {
    outputFn(`Unknown command: ${command}`);
  }
}