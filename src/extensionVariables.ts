import { window } from "vscode";

class ExtensionVariables {
  public outputChannel = window.createOutputChannel("Nuclei Vscode");
}

const extensionVariables = new ExtensionVariables();
export { extensionVariables };
