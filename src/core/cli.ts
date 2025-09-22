import { execSync, SpawnSyncReturns } from "child_process";
import { l10n, window } from "vscode";
import { Output } from "../extension";
import { Container, ContainerImage, ExecResult } from "../types";
import { fullImageName } from "./utils";

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
      return { code: 0, succesful: true, output: execSync(command).toString("utf-8") };
    }
    catch (err: any) {
      const sudo = command.indexOf('sudo -S ');
      if (sudo > -1) {
        command = command.substring(sudo);
      }
      if (isExecError(err)) {
        Output.appendLine(l10n.t("'{0}' failed: [{1}] {2}", command, err.status || "?", err.stderr.toString("utf-8")));

        return {
          succesful: false,
          code: err.status || -666,
          output: `${err.stderr.toString("utf-8")}\n${err.stdout.toString("utf-8")}`.trim()
        };
      }
      else {
        Output.appendErrorAndThrow(l10n.t("'{0}' failed: {1}", command, typeof err === "string" ? err : JSON.stringify(err)));
      };
    }
  }

  export async function execSudo(command: string) {
    const password = await getSudoPassword();
    if (password) {
      return exec(`echo ${password} | sudo -S ${command}`);
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
      if (execResult.succesful) {
        Output.appendErrorAndThrow(l10n.t("Command {0} is not a list command", command));
      }
      else {
        Output.appendErrorAndThrow(l10n.t("Command {0} failed: (1}", command, execResult.output));

      }
    }
  }

  async function getSudoPassword() {
    return await window.showInputBox({
      password: true,
      prompt: l10n.t('Enter administrator password'),
      placeHolder: l10n.t('sudo password'),
    });
  }
}

export namespace ContainerCLI {
  function exec(args: string) {
    return CLI.exec(`container ${args}`);
  }

  function execAndList<T>(args: string, transformer?: (key: string, stringValue: string) => any) {
    return CLI.execAndList<T>(`container ${args}`, transformer);
  }

  export function version() {
    return exec("--version");
  }

  export function status() {
    return exec("system status");
  }

  export function listDNS() {
    return exec("system dns list");
  }

  export function getDefaultDNS() {
    return exec("system dns default inspect");
  }

  export function setDefaultDNS(dns: string) {
    return exec(`system dns default set ${dns}`);
  }

  export function clearDefaultDNS() {
    return exec(`system dns default clear`);
  }

  export async function createDNS(dns: string) {
    return CLI.execSudo(`container system dns create ${dns}`);
  }

  export async function deleteDNS(dns: string) {
    return CLI.execSudo(`container system dns delete ${dns}`);
  }

  export function startService() {
    return exec("system start");
  }

  export function stopService() {
    return exec("system stop");
  }

  export function listImages() {
    return execAndList<ContainerImage>("images ls --verbose");
  }

  export function inspectImage(image: ContainerImage) {
    return exec(`images inspect ${fullImageName(image)}`);
  }

  export function pullImage(image: string) {
    return exec(`images pull ${image}`);
  }

  export function deleteImage(image: ContainerImage) {
    return exec(`images delete ${fullImageName(image)}`);
  }

  export function pruneImages() {
    return exec(`images prune`);
  }

  export function listContainers() {
    return execAndList<Container>("ls --all");
  }
}

function camelize(name: string) {
  //https://stackoverflow.com/questions/2970525/converting-a-string-with-spaces-into-camel-case
  return name.toLocaleLowerCase().replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()).replace(/\s+/g, '');
}

function isExecError(error: any): error is SpawnSyncReturns<Buffer> {
  return error && error.pid && error.stdout;
}