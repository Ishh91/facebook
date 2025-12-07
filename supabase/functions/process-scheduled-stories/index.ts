import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const now = new Date().toISOString();

    const { data: pendingStories, error: fetchError } = await supabase
      .from("scheduled_stories")
      .select(`
        id,
        scheduled_time,
        status,
        retry_count,
        facebook_accounts (
          is_active
        )
      `)
      .eq("status", "pending")
      .lte("scheduled_time", now)
      .lt("retry_count", 3)
      .order("scheduled_time", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("Error fetching pending stories:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending stories" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!pendingStories || pendingStories.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending stories to process",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];

    for (const story of pendingStories) {
      if (!story.facebook_accounts?.is_active) {
        await supabase
          .from("scheduled_stories")
          .update({
            status: "failed",
            error_message: "Facebook account is inactive",
          })
          .eq("id", story.id);
        
        results.push({
          story_id: story.id,
          success: false,
          error: "Account inactive",
        });
        continue;
      }

      try {
        const postResponse = await fetch(
          `${supabaseUrl}/functions/v1/post-facebook-story`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ story_id: story.id }),
          }
        );

        const postResult = await postResponse.json();

        results.push({
          story_id: story.id,
          success: postResponse.ok,
          ...(postResponse.ok ? { facebook_story_id: postResult.facebook_story_id } : { error: postResult.error }),
        });
      } catch (error) {
        console.error(`Error posting story ${story.id}:`, error);
        results.push({
          story_id: story.id,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: failedCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing scheduled stories:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});