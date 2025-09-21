import { execSync, SpawnSyncReturns } from "child_process";
import { l10n } from "vscode";
import { Output } from "../extension";

type ExecResult = {
  code: number
  output: string
  error?: string
};

export namespace CLI {
  /**
   * Runs a command and return the standard output as an UTF-8 string.
   * Throws an error if the command fails.
   * 
   * @param command The command to run, with space-separated arguments.
   * @returns the standard output
   */
  export function exec(command: string): ExecResult {
    try {
      return { code: 0, output: execSync(command).toString("utf-8") };
    }
    catch (err: any) {
      let error;
      if (isExecError(err)) {
        Output.appendLine(l10n.t("'{0}' failed: [{1}] {2}", command, err.status || "?", err.stderr.toString("utf-8")));

        return {
          code: err.status || -666,
          output: err.stdout.toString("utf-8"),
          error: err.stderr.toString("utf-8")
        };
      }
      else {
        Output.appendLineAndThrow(l10n.t("'{0}' failed: {1}", command, typeof err === "string" ? err : JSON.stringify(err)));
      };
    }
  }

  /**
   * Runs a command then parses the output to return an array of `T` items.
   * 
   * The expected command output must of the form:
   * ```
   * LABEL1   A LABEL2   LABEL3
   * val11    val12      val13
   * val21    val22      val23
   * ```
   * 
   * The first line must be the columns headings and each line below must be a row.
   * 
   * Headings are camelCased and values transformed to string by default, unless a transformer function is provided.
   * 
   * The output above will produce this array of objects:
   * ```
   * [
   *  {label1:"val11", aLabel2: "val12", label3: "val13"},
   *  {label1:"val21", aLabel2: "val22", label3: "val23"},
   * ]
   * ```
   * 
   * @param command The command to run, with space-separated arguments.
   * @param transformer an optional function that can transform a value depending on the value's key
   * @returns an array of `T`
   */
  export function execAndList<T>(command: string, transformer?: (key: string, stringValue: string) => any): T[] {
    const execResult = exec(command);
    const output = execResult.output.split("\n").filter(Boolean);
    const headerLine = output.shift();
    if (headerLine) {
      const headers = headerLine.split(/\s\s+/)
        .map((header, index, list) => ({
          label: camelize(header),
          start: index ? headerLine.indexOf(`${header}`) : 0,
          end: (index < list.length - 1 ? headerLine.indexOf(`${list.at(index + 1)}`) - 1 : undefined)
        }));

      return output.map(line => headers.reduce((row, header) => {
        const key = header.label;
        const value = line.substring(header.start, header.end).trim();
        row[key] = transformer?.(key, value) || value;
        return row;
      }, {} as Record<string, any>)) as T[];
    }
    else {
      if (execResult.code === 0) {
        Output.appendLineAndThrow(l10n.t("Command {0} is not a list command", command));
      }
      else {
        Output.appendLineAndThrow(l10n.t("Command {0} failed: (1}", command, execResult.error || execResult.output));

      }
    }

  }
}

export namespace ContainerCLI {
  function exec(args: string) {
    return CLI.exec(`container ${args}`);
  }

  export function execAndList<T>(args: string, transformer?: (key: string, stringValue: string) => any) {
    return CLI.execAndList<T>(`container ${args}`, transformer);
  }

  export function version() {
    return CLI.exec("container --version");
  }

  export function status() {
    return CLI.exec("container system status");
  }

  export function startService() {
    return CLI.exec("container system start");
  }

  export function stopService() {
    return CLI.exec("container system stop");
  }
}

function camelize(name: string) {
  //https://stackoverflow.com/questions/2970525/converting-a-string-with-spaces-into-camel-case
  return name.toLocaleLowerCase().replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()).replace(/\s+/g, '');
}

function isExecError(error: any): error is SpawnSyncReturns<Buffer> {
  return error && error.pid && error.stdout;
}