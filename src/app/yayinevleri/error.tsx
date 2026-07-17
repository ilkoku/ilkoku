"use client";
import { Button } from "@/components/ui/Button";
export default function PublishersError({ reset }: { reset: () => void }) { return <div className="publisher-empty"><h2>Yayınevleri yüklenemedi</h2><p>Lütfen bağlantınızı kontrol edip yeniden deneyin.</p><Button onClick={reset}>Yeniden Dene</Button></div>; }
