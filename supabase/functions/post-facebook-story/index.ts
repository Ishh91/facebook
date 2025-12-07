import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PostStoryRequest {
  story_id: string;
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
      const { story_id }: PostStoryRequest = await req.json();

      if (!story_id) {
        return new Response(
          JSON.stringify({ error: "story_id is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: story, error: storyError } = await supabase
        .from("scheduled_stories")
        .select(`
          *,
          facebook_accounts (
            access_token,
            facebook_user_id,
            page_id,
            token_expires_at
          )
        `)
        .eq("id", story_id)
        .single();

      if (storyError || !story) {
        return new Response(
          JSON.stringify({ error: "Story not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (story.status === "posted") {
        return new Response(
          JSON.stringify({ error: "Story already posted" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      await supabase
        .from("scheduled_stories")
        .update({ status: "processing" })
        .eq("id", story_id);

      const fbAccount = story.facebook_accounts;
      
      if (new Date(fbAccount.token_expires_at) < new Date()) {
        await supabase
          .from("scheduled_stories")
          .update({
            status: "failed",
            error_message: "Facebook access token has expired",
          })
          .eq("id", story_id);

        return new Response(
          JSON.stringify({ error: "Access token expired" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const targetId = fbAccount.page_id || fbAccount.facebook_user_id;
      const accessToken = fbAccount.access_token;

      let fbResponse;
      
      if (story.story_type === "image") {
        const formData = new FormData();
        formData.append("photo_url", story.media_url);
        if (story.caption) {
          formData.append("caption", story.caption);
        }
        formData.append("access_token", accessToken);

        fbResponse = await fetch(
          `https://graph.facebook.com/v18.0/${targetId}/photo_stories`,
          {
            method: "POST",
            body: formData,
          }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "Video stories not yet supported" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const fbData = await fbResponse.json();

      if (!fbResponse.ok || fbData.error) {
        await supabase
          .from("scheduled_stories")
          .update({
            status: "failed",
            error_message: fbData.error?.message || "Failed to post to Facebook",
            retry_count: story.retry_count + 1,
          })
          .eq("id", story_id);

        return new Response(
          JSON.stringify({
            error: "Failed to post to Facebook",
            details: fbData.error,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      await supabase
        .from("scheduled_stories")
        .update({
          status: "posted",
          posted_at: new Date().toISOString(),
          facebook_story_id: fbData.id || fbData.post_id,
        })
        .eq("id", story_id);

      return new Response(
        JSON.stringify({
          success: true,
          facebook_story_id: fbData.id || fbData.post_id,
          message: "Story posted successfully",
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
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});