// Document-lifetime, read-only tools. No account state, network calls,
// cookies or private content are read. Unsupported browsers do nothing.
(async function registerIlkOkuPublicTools() {
  const context = document.modelContext;
  if (!context || typeof context.registerTool !== "function") return;

  const origin = "https://ilkoku.com";
  const resources = [
    ["Ana sayfa", "/"],
    ["Hakkımızda", "/hakkimizda"],
    ["Nasıl çalışır?", "/nasil-calisir"],
    ["Editoryal standartlar", "/editoryal-standartlar"],
    ["Yazarlar için", "/yazarlar-icin"],
    ["Okurlar için", "/okurlar-icin"],
    ["Editörler için", "/editorler-icin"],
    ["Yayınevleri için", "/yayinevleri-icin"],
    ["İletişim", "/iletisim"],
    ["Kullanım şartları", "/yasal/kullanim-sartlari"],
    ["Gizlilik politikası", "/yasal/gizlilik-politikasi"],
    ["KVKK", "/yasal/kvkk"],
    ["AI kaynak rehberi", "/llms.txt"],
    ["Markdown özeti", "/agent/home.md"],
  ];
  const emptyInput = { type: "object", properties: {}, additionalProperties: false };
  const validInput = (input) => input === undefined ||
    (input !== null && typeof input === "object" && !Array.isArray(input) && Object.keys(input).length === 0);
  const invalidInput = () => ({ error: "This public tool takes no parameters." });
  const tools = [
    {
      name: "ilkoku_get_platform_info",
      description: "Returns the purpose and public user roles of the Turkish digital writing platform İlkOku.",
      inputSchema: emptyInput,
      execute(input) {
        if (!validInput(input)) return invalidInput();
        return {
          name: "İlkOku",
          description: "Yazarları, okurları, editörleri ve yayınevlerini buluşturan dijital platform",
          language: "tr-TR",
          roles: ["yazar", "okur", "editör", "yayınevi"],
          url: origin + "/",
          help: origin + "/nasil-calisir",
          contact: origin + "/iletisim",
        };
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: "ilkoku_list_public_resources",
      description: "Returns official public İlkOku resource links for guidance, support, legal information and agent-readable summaries.",
      inputSchema: emptyInput,
      execute(input) {
        if (!validInput(input)) return invalidInput();
        return { resources: resources.map(([title, path]) => ({ title, url: origin + path })) };
      },
      annotations: { readOnlyHint: true },
    },
  ];
  for (const tool of tools) {
    try {
      await context.registerTool(tool);
    } catch {
      // Optional preview API must never interfere with normal site usage.
    }
  }
})()
