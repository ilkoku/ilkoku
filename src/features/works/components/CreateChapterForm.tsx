import { Button } from "@/components/ui/Button";
import { createNextChapterAction } from "../actions";

export function CreateChapterForm({ workId }: { workId: string }) {
  return (
    <form action={createNextChapterAction}>
      <input name="workId" type="hidden" value={workId} />
      <Button type="submit">İlk Bölümü Oluştur</Button>
    </form>
  );
}
