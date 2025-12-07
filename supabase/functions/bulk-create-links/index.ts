import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BulkLinkRequest {
  links: Array<{
    original_url: string;
    custom_code?: string;
    is_affiliate?: boolean;
    redirect_delay?: number;
    title?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST") {
      const { links }: BulkLinkRequest = await req.json();

      if (!links || !Array.isArray(links) || links.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invalid request. 'links' array is required." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (links.length > 100) {
        return new Response(
          JSON.stringify({ error: "Maximum 100 links per request" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const generateShortCode = () => {
        const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 6; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };

      const createdLinks = [];
      const errors = [];

      for (let i = 0; i < links.length; i++) {
        const link = links[i];

        if (!link.original_url) {
          errors.push({ index: i, error: "Missing original_url" });
          continue;
        }

        if (!link.original_url.startsWith("http://") && !link.original_url.startsWith("https://")) {
          errors.push({ index: i, error: "URL must start with http:// or https://" });
          continue;
        }

        let shortCode = link.custom_code || generateShortCode();
        let attempts = 0;
        let codeExists = true;

        while (codeExists && attempts < 10) {
          const { data: existing } = await supabase
            .from("links")
            .select("short_code")
            .eq("short_code", shortCode)
            .maybeSingle();

          if (!existing) {
            codeExists = false;
          } else {
            shortCode = generateShortCode();
            attempts++;
          }
        }

        if (codeExists) {
          errors.push({ index: i, error: "Could not generate unique short code" });
          continue;
        }

        const { data, error } = await supabase
          .from("links")
          .insert({
            short_code: shortCode,
            original_url: link.original_url,
            title: link.title || "",
            is_affiliate: link.is_affiliate || false,
            redirect_delay: link.redirect_delay || 3,
            created_by_ip: "api",
          })
          .select()
          .single();

        if (error) {
          errors.push({ index: i, error: error.message });
        } else {
          createdLinks.push(data);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          created: createdLinks.length,
          failed: errors.length,
          links: createdLinks,
          errors: errors,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          message: "Bulk Link Creation API",
          usage: "POST /bulk-create-links with JSON body containing 'links' array",
          example: {
            links: [
              {
                original_url: "https://example.com",
                custom_code: "optional",
                is_affiliate: false,
                redirect_delay: 3,
                title: "My Link",
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});