package com.fourh3.app;

import android.provider.ContactsContract;
import android.database.Cursor;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONArray;
import org.json.JSONObject;

public class ContactsBridge {
    private final MainActivity activity;
    private final WebView webView;
    private final int requestCode;

    ContactsBridge(MainActivity activity, WebView webView, int requestCode) {
        this.activity = activity;
        this.webView = webView;
        this.requestCode = requestCode;
    }

    @JavascriptInterface
    public boolean hasPermission() {
        return activity.hasContactsPermission();
    }

    @JavascriptInterface
    public void requestPermission() {
        activity.runOnUiThread(activity::requestContactsPermission);
    }

    private String payload(boolean permissionRequired, JSONArray contacts, String error) {
        try {
            JSONObject body = new JSONObject();
            body.put("permission_required", permissionRequired);
            body.put("contacts", contacts);
            if (error != null) body.put("error", error);
            return body.toString();
        } catch (Exception ignored) {
            return "{\"error\":\"json_encode_failed\",\"contacts\":[]}";
        }
    }

    @JavascriptInterface
    public String search(String rawQuery) {
        JSONArray out = new JSONArray();
        if (!activity.hasContactsPermission()) return payload(true, out, null);

        String q = rawQuery == null ? "" : rawQuery.trim();
        Uri uri = ContactsContract.CommonDataKinds.Email.CONTENT_URI;
        String[] projection = {
            ContactsContract.CommonDataKinds.Email.CONTACT_ID,
            ContactsContract.CommonDataKinds.Email.DISPLAY_NAME_PRIMARY,
            ContactsContract.CommonDataKinds.Email.ADDRESS
        };
        String selection = null;
        String[] args = null;
        if (!q.isEmpty()) {
            selection = ContactsContract.CommonDataKinds.Email.DISPLAY_NAME_PRIMARY +
                    " LIKE ? OR " + ContactsContract.CommonDataKinds.Email.ADDRESS + " LIKE ?";
            args = new String[]{"%" + q + "%", "%" + q + "%"};
        }

        try (Cursor c = activity.getContentResolver().query(
                uri, projection, selection, args,
                ContactsContract.CommonDataKinds.Email.DISPLAY_NAME_PRIMARY + " ASC")) {
            int count = 0;
            if (c != null) {
                while (c.moveToNext() && count < 50) {
                    String id = c.getString(0);
                    String name = c.getString(1);
                    String email = c.getString(2);
                    if (email == null || !email.contains("@")) continue;
                    try {
                        JSONObject contact = new JSONObject();
                        contact.put("id", id);
                        contact.put("name", name == null ? email : name);
                        contact.put("email", email);
                        out.put(contact);
                        count++;
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception e) {
            return payload(false, out, e.getClass().getSimpleName());
        }
        return payload(false, out, null);
    }
}
