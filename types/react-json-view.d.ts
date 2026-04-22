declare module "react-json-view" {
  import { ComponentType } from "react";

  interface ReactJsonProps {
    src: unknown;
    name?: string | false;
    theme?: string;
    collapsed?: boolean | number;
    enableClipboard?: boolean;
    displayDataTypes?: boolean;
    displayObjectSize?: boolean;
    collapseStringsAfterLength?: number;
    style?: React.CSSProperties;
  }

  const ReactJson: ComponentType<ReactJsonProps>;
  export default ReactJson;
}
