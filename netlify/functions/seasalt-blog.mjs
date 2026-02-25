// seasalt-blog.mjs — Blog renderer for seasaltpickles.com/blog
// Uses Node.js https module (NOT fetch) for maximum Netlify compatibility
import https from 'https';
import { URL } from 'url';

var SU = process.env.SUPABASE_URL || 'https://yosjbsncvghpscsrvxds.supabase.co';
var SK = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
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
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { reject(new Error('Parse error (HTTP ' + res.statusCode + '): ' + data.substring(0, 300))); }
      });
    });
    req.on('error', function(e) { reject(new Error('HTTPS error: ' + e.message)); });
    req.on('timeout', function() { req.destroy(); reject(new Error('Request timeout after 12s')); });
    req.end();
  });
}

export var handler = async function(event) {
  var slug = (event.path || '').replace(/^\/blog\/?/, '').replace(/^\.netlify\/functions\/seasalt-blog\/?/, '').replace(/\/$/, '');
  var H = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' };

  // Debug: log env status
  console.log('[Blog] SU=' + SU.substring(0, 30) + '... SK=' + (SK ? 'set(' + SK.length + ' chars)' : 'MISSING') + ' slug=' + (slug || '(listing)'));

  // Blog listing
  if (!slug) {
    try {
      var result = await supaGet('blog_posts?status=eq.published&order=published_at.desc&limit=50&select=title,slug,excerpt,meta_description,image_url,published_at,keywords,product_name');
      console.log('[Blog] Supabase response status:', result.status);
      if (result.status === 404 || (result.data && result.data.message && result.data.message.indexOf('relation') >= 0)) {
        return { statusCode: 200, headers: H, body: setupPage('Table "blog_posts" does not exist. Run create-blog-table.sql in Supabase SQL Editor first.') };
      }
      if (!Array.isArray(result.data)) {
        return { statusCode: 200, headers: H, body: setupPage('Unexpected response from Supabase: ' + JSON.stringify(result.data).substring(0, 200)) };
      }
      return { statusCode: 200, headers: H, body: listPage(result.data) };
    } catch (e) {
      console.log('[Blog] Error:', e.message);
      return { statusCode: 200, headers: H, body: setupPage(e.message) };
    }
  }

  // Single post
  try {
    var result = await supaGet('blog_posts?slug=eq.' + encodeURIComponent(slug) + '&limit=1');
    if (Array.isArray(result.data) && result.data.length > 0) return { statusCode: 200, headers: H, body: postPage(result.data[0]) };
    return { statusCode: 404, headers: H, body: notFound(slug) };
  } catch (e) {
    return { statusCode: 200, headers: H, body: setupPage('Error loading post: ' + e.message) };
  }
};

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function head(title, desc, extra) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(title) + '</title>'
    + '<meta name="description" content="' + esc(desc) + '">'
    + '<link rel="icon" href="/favicon.ico">'
    + '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    + '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">'
    + (extra || '')
    + '<style>' + css() + '</style></head>';
}

function nav() {
  return '<header><div class="wrap"><a href="/" class="logo"><span class="logo-icon">\uD83E\uDED9</span> SeaSalt Pickles</a>'
    + '<nav><a href="/">Home</a><a href="/blog" class="active">Blog</a><a href="/">Shop</a></nav></div></header>';
}

function footer() {
  return '<footer><div class="wrap"><div class="f-grid"><div><h4>\uD83E\uDED9 SeaSalt Pickles</h4><p>Premium homemade Andhra pickles, masalas & snacks from Hyderabad. 100% natural, no preservatives.</p></div>'
    + '<div><h4>Shop</h4><a href="/category/non-veg-pickles">Non Veg Pickles</a><a href="/category/vegetarian">Veg Pickles</a><a href="/category/podis-masalas">Masalas & Podis</a><a href="/category/sweets-snacks">Sweets & Snacks</a></div>'
    + '<div><h4>Connect</h4><a href="https://instagram.com/seasaltpickles" target="_blank">Instagram</a><a href="https://wa.me/918096203122" target="_blank">WhatsApp</a><a href="mailto:seasaltpickles@gmail.com">Email</a></div></div>'
    + '<div class="f-bottom"><p>&copy; ' + new Date().getFullYear() + ' SeaSalt Pickles. All rights reserved.</p></div></div></footer>';
}

function listPage(posts) {
  var cards = '';
  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    var date = p.published_at ? new Date(p.published_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    cards += '<article class="card"><a href="/blog/' + esc(p.slug) + '">';
    if (p.image_url) cards += '<div class="card-img"><img src="' + esc(p.image_url) + '" alt="' + esc(p.title) + '" loading="lazy"></div>';
    cards += '<div class="card-body"><h2>' + esc(p.title) + '</h2>';
    cards += '<p class="excerpt">' + esc(p.excerpt || p.meta_description || '') + '</p>';
    var meta = '<time>' + date + '</time>';
    if (p.product_name) meta += '<span class="tag">\uD83E\uDED9 ' + esc(p.product_name) + '</span>';
    cards += '<div class="meta">' + meta + '</div></div></a></article>';
  }
  if (!cards) cards = '<div class="empty"><div class="empty-icon">\uD83D\uDCDD</div><h3>No blog posts yet</h3><p>Blog posts will appear here once you generate them from the Intelligence Dashboard.</p><p style="margin-top:12px;font-size:13px;color:#aaa;">(Connection to Supabase is working \u2714\uFE0F)</p></div>';

  return head('Blog | SeaSalt Pickles \u2014 Recipes, Health Tips & Food Stories',
    'Discover authentic Andhra pickle recipes, health benefits, food stories and cooking tips from SeaSalt Pickles, Hyderabad.',
    '<meta property="og:title" content="SeaSalt Pickles Blog"><meta property="og:type" content="website"><meta property="og:url" content="' + SITE + '/blog"><link rel="canonical" href="' + SITE + '/blog">')
    + '<body>' + nav()
    + '<main class="wrap"><div class="hero-blog"><h1>Our Blog</h1><p>Recipes, health tips, food stories & more from the world of authentic Andhra pickles</p></div>'
    + '<div class="grid">' + cards + '</div></main>' + footer() + '</body></html>';
}

function postPage(post) {
  var date = post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  var schema = JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":post.title,"description":post.meta_description||post.excerpt||'',"image":post.image_url||'',"datePublished":post.published_at||'',"author":{"@type":"Organization","name":"SeaSalt Pickles","url":SITE},"publisher":{"@type":"Organization","name":"SeaSalt Pickles"}});

  var faqSchema = '';
  if (post.content && post.content.indexOf('FAQ') >= 0) {
    var faqItems = [];
    var qs = (post.content || '').match(/<h3[^>]*>(.*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/gi);
    if (qs) {
      for (var i = 0; i < qs.length && i < 5; i++) {
        var qM = qs[i].match(/<h3[^>]*>(.*?)<\/h3>/i);
        var aM = qs[i].match(/<\/h3>\s*<p>([\s\S]*?)<\/p>/i);
        if (qM && aM) faqItems.push({"@type":"Question","name":qM[1].replace(/<[^>]*>/g,''),"acceptedAnswer":{"@type":"Answer","text":aM[1].replace(/<[^>]*>/g,'')}});
      }
    }
    if (faqItems.length > 0) faqSchema = '<script type="application/ld+json">' + JSON.stringify({"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqItems}) + '</script>';
  }

  var tagsHtml = '';
  if (post.keywords) {
    var kws = post.keywords.split(',');
    tagsHtml = '<div class="tags">';
    for (var i = 0; i < kws.length; i++) tagsHtml += '<span class="kw-tag">' + esc(kws[i].trim()) + '</span>';
    tagsHtml += '</div>';
  }

  return head(post.title + ' | SeaSalt Pickles Blog', post.meta_description || post.excerpt || '',
    '<meta name="keywords" content="' + esc(post.keywords || '') + '">'
    + '<meta property="og:title" content="' + esc(post.title) + '">'
    + '<meta property="og:description" content="' + esc(post.meta_description || '') + '">'
    + '<meta property="og:image" content="' + esc(post.image_url || '') + '">'
    + '<meta property="og:type" content="article">'
    + '<meta property="og:url" content="' + SITE + '/blog/' + esc(post.slug) + '">'
    + '<link rel="canonical" href="' + SITE + '/blog/' + esc(post.slug) + '">'
    + '<script type="application/ld+json">' + schema + '</script>' + faqSchema)
    + '<body>' + nav()
    + '<main class="wrap"><article class="post">'
    + '<div class="post-nav"><a href="/blog">\u2190 All Posts</a><time>' + date + '</time></div>'
    + '<h1>' + esc(post.title) + '</h1>'
    + (post.image_url ? '<img src="' + esc(post.image_url) + '" alt="' + esc(post.title) + '" class="hero-img">' : '')
    + '<div class="content">' + (post.content || '') + '</div>'
    + tagsHtml
    + (post.product_name ? '<div class="cta-box"><h3>\uD83D\uDED2 Try Our ' + esc(post.product_name) + '</h3><p>Authentic, homemade, no preservatives. Crafted with love in Hyderabad.</p><a href="/category/all-products" class="cta-btn">Shop Now \u2192</a></div>' : '')
    + '</article></main>' + footer() + '</body></html>';
}

function notFound(slug) {
  return head('Not Found | SeaSalt Pickles', '')
    + '<body>' + nav() + '<main class="wrap" style="text-align:center;padding:80px 20px"><div style="font-size:4rem;margin-bottom:16px;">\uD83D\uDD0D</div><h1 style="font-size:2rem;margin-bottom:12px;">Post Not Found</h1><p style="color:#666;margin-bottom:24px;">The blog post "' + esc(slug) + '" was not found.</p><a href="/blog" class="cta-btn">\u2190 Back to Blog</a></main>' + footer() + '</body></html>';
}

function setupPage(msg) {
  return head('Blog Setup | SeaSalt Pickles', '')
    + '<body>' + nav() + '<main class="wrap" style="padding:60px 20px;max-width:700px;">'
    + '<div style="text-align:center;margin-bottom:24px;"><div style="font-size:3rem;margin-bottom:12px;">\u26A0\uFE0F</div><h1 style="font-size:1.5rem;">Blog Setup Needed</h1></div>'
    + '<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:12px;padding:24px;font-size:0.9rem;color:#92400e;">'
    + '<p style="margin-bottom:16px;font-weight:700;">Issue: ' + esc(msg) + '</p>'
    + '<p style="margin-bottom:8px;font-weight:600;">Fix:</p><ol style="padding-left:20px;line-height:2.2;">'
    + '<li>Go to Supabase SQL Editor and run <code>create-blog-table.sql</code></li>'
    + '<li>Redeploy the site (Deploys \u2192 Trigger Deploy)</li>'
    + '<li>Use the Intelligence Dashboard to generate blog posts</li></ol></div>'
    + '<div style="text-align:center;margin-top:24px;"><a href="/" class="cta-btn">\u2190 Back to Home</a></div></main>' + footer() + '</body></html>';
}

function css() {
  return '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:Outfit,-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a2e;line-height:1.7;background:#fff}'
    + '.wrap{max-width:960px;margin:0 auto;padding:0 20px}'
    + 'header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:14px 0;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.15)}'
    + 'header .wrap{display:flex;align-items:center;justify-content:space-between}'
    + '.logo{color:#fff;text-decoration:none;font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px}.logo-icon{font-size:22px}'
    + 'nav a{color:rgba(255,255,255,.6);text-decoration:none;margin-left:28px;font-size:14px;font-weight:500;transition:.2s}nav a:hover,nav a.active{color:#fff}'
    + '.hero-blog{text-align:center;padding:48px 0 32px}'
    + '.hero-blog h1{font-family:"Playfair Display",serif;font-size:38px;margin-bottom:8px;background:linear-gradient(135deg,#D4451A,#ea580c);-webkit-background-clip:text;-webkit-text-fill-color:transparent}'
    + '.hero-blog p{color:#666;font-size:16px}'
    + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;padding-bottom:60px}'
    + '.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);transition:.3s;border:1px solid #f0f0f0}'
    + '.card:hover{transform:translateY(-4px);box-shadow:0 12px 36px rgba(0,0,0,.1);border-color:rgba(212,69,26,.2)}'
    + '.card a{text-decoration:none;color:inherit}'
    + '.card-img{height:200px;overflow:hidden;background:#f8f7f4}img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.card:hover img{transform:scale(1.05)}'
    + '.card-body{padding:18px}h2{font-family:"Playfair Display",serif;font-size:17px;margin-bottom:8px;line-height:1.4;color:#1a1a2e}'
    + '.excerpt{font-size:13px;color:#666;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'
    + '.meta{font-size:11px;color:#999;display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
    + '.tag{background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}'
    + '.kw-tag{background:#f3f4f6;color:#555;padding:4px 12px;border-radius:20px;font-size:12px}'
    + '.empty{text-align:center;padding:60px 20px}.empty-icon{font-size:4rem;margin-bottom:16px}.empty h3{font-size:1.3rem;margin-bottom:8px}.empty p{color:#888;max-width:400px;margin:0 auto}'
    + '.post{padding:40px 0 60px;max-width:720px;margin:0 auto}'
    + '.post-nav{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#888;margin-bottom:20px}.post-nav a{color:#D4451A;text-decoration:none;font-weight:600}'
    + '.post h1{font-family:"Playfair Display",serif;font-size:34px;line-height:1.3;margin-bottom:20px}'
    + '.hero-img{width:100%;max-height:420px;object-fit:cover;border-radius:16px;margin-bottom:32px;box-shadow:0 8px 24px rgba(0,0,0,.08)}'
    + '.content{font-size:17px;line-height:1.85}'
    + '.content h2{font-family:"Playfair Display",serif;font-size:26px;margin:36px 0 14px;border-bottom:2px solid #fee2e2;padding-bottom:8px}'
    + '.content h3{font-size:20px;margin:28px 0 10px;color:#333}'
    + '.content p{margin-bottom:18px}.content ul,.content ol{margin:18px 0;padding-left:28px}.content li{margin-bottom:8px}'
    + '.content a{color:#D4451A;font-weight:500}'
    + '.content blockquote{border-left:4px solid #D4451A;padding:12px 20px;margin:20px 0;background:#fef2f2;border-radius:0 10px 10px 0;font-style:italic}'
    + '.tags{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0;padding-top:16px;border-top:1px solid #f0f0f0}'
    + '.cta-box{background:linear-gradient(135deg,#D4451A,#ea580c);color:#fff;padding:32px;border-radius:16px;margin:40px 0;text-align:center;box-shadow:0 8px 32px rgba(212,69,26,.25)}'
    + '.cta-box h3{font-family:"Playfair Display",serif;font-size:22px;margin-bottom:8px}.cta-box p{opacity:.9;margin-bottom:16px}'
    + '.cta-btn{display:inline-block;background:#fff;color:#D4451A;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;transition:.2s;box-shadow:0 4px 16px rgba(0,0,0,.1)}.cta-btn:hover{transform:scale(1.03)}'
    + 'footer{background:linear-gradient(135deg,#1a1a2e,#16213e);color:rgba(255,255,255,.7);padding:40px 0 24px;margin-top:40px}'
    + '.f-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:32px;margin-bottom:24px}'
    + 'footer h4{color:#fff;margin-bottom:12px;font-size:15px}footer p{font-size:13px;line-height:1.6}'
    + 'footer a{color:rgba(255,255,255,.6);text-decoration:none;display:block;font-size:13px;margin-bottom:6px}footer a:hover{color:#fff}'
    + '.f-bottom{border-top:1px solid rgba(255,255,255,.1);padding-top:16px;text-align:center;font-size:12px}'
    + 'code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:0.85em}'
    + '@media(max-width:640px){.grid{grid-template-columns:1fr}.f-grid{grid-template-columns:1fr}.post h1{font-size:26px}.hero-blog h1{font-size:28px}nav a{margin-left:16px}}';
}
