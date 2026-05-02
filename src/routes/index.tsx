import { Title } from "@solidjs/meta";
import ColorIO from "~/components/ColorIO";

export default function Home() {
  return (
    <>
      <Title>Color.io | RAW Photo Editor</Title>
      <ColorIO />
    </>
  );
}
