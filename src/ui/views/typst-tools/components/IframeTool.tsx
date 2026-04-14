import { useRef } from 'preact/hooks';

import './IframeTool.css';

interface IframeToolProps {
  src: string;
}

export const IframeTool = ({ src }: IframeToolProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return <iframe ref={iframeRef} src={src} class="typstmate-iframe-tool" />;
};
