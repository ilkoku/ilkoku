import { enheduannaIllustrationBase64 } from "../illustrations/enheduanna";
import { zenodotosIllustrationBase64 } from "../illustrations/zenodotos";
import { cambridgeIllustrationBase64 } from "../illustrations/cambridge";
import { cinemaIllustrationBase64 } from "../illustrations/cinema";

type RouteProps = {
  params: Promise<{ name: string }>;
};

const illustrations: Record<string, string> = {
  enheduanna: enheduannaIllustrationBase64,
  zenodotos: zenodotosIllustrationBase64,
  cambridge: cambridgeIllustrationBase64,
  cinema: cinemaIllustrationBase64,
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { name } = await params;
  const illustration = illustrations[name];

  if (!illustration) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(Buffer.from(illustration, "base64"), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
