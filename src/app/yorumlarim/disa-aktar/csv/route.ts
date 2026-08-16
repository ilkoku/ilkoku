import { getWriterCommentExportPage } from "@/features/writer-comments/reporting";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

function spreadsheetSafe(value: string) {
  const cleaned = value.replaceAll("\0", "");

  return /^\s*[=+\-@]/u.test(cleaned)
    ? `'${cleaned}`
    : cleaned;
}

function csvCell(value: string | null) {
  const safe = spreadsheetSafe(value ?? "")
    .replaceAll('"', '""');

  return `"${safe}"`;
}

function csvRow(values: Array<string | null>) {
  return `${values.map(csvCell).join(",")}\r\n`;
}

function iso(value: Date | null) {
  return value?.toISOString() ?? "";
}

export async function GET() {
  const writer = await getCurrentUser();

  if (
    !writer ||
    writer.role !== "writer" ||
    writer.status !== "active"
  ) {
    return new Response("Erişim reddedildi.", {
      status: 403,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            "\uFEFF" +
              csvRow([
                "Yorum ID",
                "Eser",
                "Bölüm",
                "Okur",
                "Kullanıcı adı",
                "Yorum",
                "Yorum tarihi",
                "Yazar yanıtladı",
                "Yazar yanıtı",
                "Yanıt tarihi",
              ]),
          ),
        );

        let cursor: string | null = null;

        do {
          const page = await getWriterCommentExportPage({
            authorId: writer.id,
            cursor,
          });

          for (const row of page.rows) {
            controller.enqueue(
              encoder.encode(
                csvRow([
                  row.commentPublicId,
                  row.workTitle,
                  row.chapterTitle,
                  row.readerName,
                  row.readerUsername,
                  row.comment,
                  iso(row.commentAt),
                  row.authorReply ? "Evet" : "Hayır",
                  row.authorReply,
                  iso(row.authorReplyAt),
                ]),
              ),
            );
          }

          cursor = page.nextCursor;
        } while (cursor);

        controller.close();
      } catch (error) {
        console.error("WRITER_COMMENT_CSV_EXPORT_FAILED", {
          error:
            error instanceof Error
              ? error.message
              : "UNKNOWN_ERROR",
          writerId: writer.id,
        });
        controller.error(error);
      }
    },
  });

  const date = new Date().toISOString().slice(0, 10);

  return new Response(stream, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition":
        `attachment; filename="ilkoku-yorumlar-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
