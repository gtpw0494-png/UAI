package com.fourh3.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;

import org.json.JSONObject;

import java.util.Collections;

public class MainActivity extends Activity {
    private static final int CONTACTS_REQUEST = 4433;
    private static final String APP_ORIGIN = "https://appassets.androidplatform.net";
    private WebView webView;
    private ContactsBridge contactsBridge;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        contactsBridge = new ContactsBridge(this, CONTACTS_REQUEST);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSavePassword(false);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (APP_ORIGIN.equals(uri.getScheme()+"://"+uri.getHost()) && uri.getPath()!=null && uri.getPath().startsWith("/assets/")) {
                    return false;
                }
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                }
                return true;
            }
        });

        WebViewCompat.addWebMessageListener(
                webView,
                "AndroidContacts",
                Collections.singleton(APP_ORIGIN),
                (view, message, sourceOrigin, isMainFrame, replyProxy) -> {
                    if (!isMainFrame || !APP_ORIGIN.equals(sourceOrigin.toString())) return;
                    handleContactMessage(message, replyProxy);
                }
        );

        webView.loadUrl(APP_ORIGIN + "/assets/index.html");
    }

    private void handleContactMessage(WebMessageCompat message, JavaScriptReplyProxy reply) {
        try {
            JSONObject request = new JSONObject(message.getData());
            String id = request.optString("id", "");
            String action = request.optString("action", "");
            JSONObject response = new JSONObject();
            response.put("id", id);
            if ("hasPermission".equals(action)) {
                response.put("ok", true);
                response.put("granted", hasContactsPermission());
            } else if ("requestPermission".equals(action)) {
                runOnUiThread(this::requestContactsPermission);
                response.put("ok", true);
                response.put("requested", true);
            } else if ("search".equals(action)) {
                response.put("ok", true);
                response.put("payload", new JSONObject(contactsBridge.search(request.optString("query", ""))));
            } else {
                response.put("ok", false);
                response.put("error", "unsupported_action");
            }
            reply.postMessage(response.toString());
        } catch (Exception e) {
            try {
                JSONObject response = new JSONObject();
                response.put("ok", false);
                response.put("error", "invalid_bridge_message");
                reply.postMessage(response.toString());
            } catch (Exception ignored) {}
        }
    }

    public boolean hasContactsPermission() {
        return checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
    }

    public void requestContactsPermission() {
        requestPermissions(new String[]{Manifest.permission.READ_CONTACTS}, CONTACTS_REQUEST);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CONTACTS_REQUEST) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            webView.post(() -> webView.evaluateJavascript("window.on4H3ContactsPermission && window.on4H3ContactsPermission("+granted+")", null));
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
