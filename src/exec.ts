import { execSync, SpawnSyncReturns } from "child_process";
import { l10n } from "vscode";
import { Output } from "./extension";

/**
 * Runs a command and return the standard output as an UTF-8 string.
 * Throws an error if the command fails.
 * 
 * @param command The command to run, with space-separated arguments.
 * @returns the standard output
 */
export function exec(command: string) {
  try {
    return execSync(command).toString("utf-8");
  }
  catch (error: any) {
    if (isExecError(error)) {
      Output.appendLineAndThrow(l10n.t("Failed to run {0}:[{1}] {2}", command, error.status || "?", error.stderr.toString("utf-8")));
    }
    else {
      Output.appendLineAndThrow(l10n.t("Failed to run {0}: {1}", command, typeof error === "string" ? error : JSON.stringify(error)));
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
export function execList<T>(command: string, transformer?: (key: string, stringValue: string) => any): T[] {
  const output = exec(command).split("\n").filter(Boolean);
  const headerLine = output.shift();
  if (headerLine) {
    const headers = headerLine.split(/\s\s\s+/)
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
    Output.appendLineAndThrow(l10n.t("Command {0} is not a list command", command));
  }

}

function camelize(name: string) {
  //https://stackoverflow.com/questions/2970525/converting-a-string-with-spaces-into-camel-case
  return name.toLocaleLowerCase().replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()).replace(/\s+/g, '');
}

function isExecError(error: any): error is SpawnSyncReturns<Buffer> {
  return error && error.pid && error.stdout;
}