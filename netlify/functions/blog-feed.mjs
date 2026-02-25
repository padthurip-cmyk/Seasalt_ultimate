// RSS Feed for SeaSalt Pickles Blog
// Generates XML RSS feed from blog_posts table
// Used by dlvr.it to auto-post to Google Business Profile
import https from 'https';
import { URL } from 'url';

// Hardcoded — env vars had a typo previously
var SU = 'https://yosjbsncvghpscsrvxds.supabase.co';
var SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
var SITE = 'https://seasaltpickles.com';

function supaGet(path) {
  return new Promise(function(resolve, reject) {
    var fullUrl = SU + '/rest/v1/' + path;
    var parsed = new URL(fullUrl);
    var opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'apikey': SK,
        'Authorization': 'Bearer ' + SK,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 12000
    };
    var req = https.request(opts, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error')); }
      });
    });
    req.on('error', function(e) { reject(e); });
    req.on('timeout', function() { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export var handler = async function(event) {
  var H = { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' };

  try {
    var posts = await supaGet('blog_posts?status=eq.published&order=published_at.desc&limit=20&select=title,slug,excerpt,meta_description,image_url,published_at,keywords,content,product_name');

    if (!Array.isArray(posts)) posts = [];

    var now = new Date().toUTCString();
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">\n';
    xml += '<channel>\n';
    xml += '  <title>SeaSalt Pickles Blog</title>\n';
    xml += '  <link>' + SITE + '/blog</link>\n';
    xml += '  <description>Authentic Andhra pickle recipes, health tips, food stories and cooking tips from SeaSalt Pickles, Hyderabad. 100% natural, no preservatives.</description>\n';
    xml += '  <language>en-in</language>\n';
    xml += '  <lastBuildDate>' + now + '</lastBuildDate>\n';
    xml += '  <atom:link href="' + SITE + '/blog/feed.xml" rel="self" type="application/rss+xml"/>\n';
    xml += '  <image>\n';
    xml += '    <url>' + SITE + '/images/logo.png</url>\n';
    xml += '    <title>SeaSalt Pickles</title>\n';
    xml += '    <link>' + SITE + '</link>\n';
    xml += '  </image>\n';

    for (var i = 0; i < posts.length; i++) {
      var p = posts[i];
      var pubDate = p.published_at ? new Date(p.published_at).toUTCString() : now;
      var desc = p.excerpt || p.meta_description || stripHtml(p.content || '').substring(0, 300);
      var postUrl = SITE + '/blog/' + (p.slug || '');

      // For Google Business Profile: short summary + link (dlvr.it uses description)
      var gbpSummary = stripHtml(desc).substring(0, 250);
      if (p.product_name) gbpSummary += ' | Try our ' + p.product_name + ' at seasaltpickles.com';

      xml += '  <item>\n';
      xml += '    <title>' + esc(p.title || 'SeaSalt Pickles Blog') + '</title>\n';
      xml += '    <link>' + esc(postUrl) + '</link>\n';
      xml += '    <guid isPermaLink="true">' + esc(postUrl) + '</guid>\n';
      xml += '    <pubDate>' + pubDate + '</pubDate>\n';
      xml += '    <description>' + esc(gbpSummary) + '</description>\n';

      if (p.image_url) {
        xml += '    <media:content url="' + esc(p.image_url) + '" medium="image"/>\n';
        xml += '    <enclosure url="' + esc(p.image_url) + '" type="image/jpeg" length="0"/>\n';
      }

      if (p.keywords) {
        var kws = p.keywords.split(',');
        for (var j = 0; j < kws.length; j++) {
          xml += '    <category>' + esc(kws[j].trim()) + '</category>\n';
        }
      }

      xml += '  </item>\n';
    }

    xml += '</channel>\n</rss>';

    return { statusCode: 200, headers: H, body: xml };

  } catch(e) {
    console.log('[RSS] Error:', e.message);
    // Return empty valid RSS on error
    return {
      statusCode: 200,
      headers: H,
      body: '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>SeaSalt Pickles Blog</title><link>' + SITE + '/blog</link><description>Blog coming soon</description></channel></rss>'
    };
  }
};
