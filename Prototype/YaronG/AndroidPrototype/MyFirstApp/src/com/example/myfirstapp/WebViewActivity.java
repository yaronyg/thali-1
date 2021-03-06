package com.example.myfirstapp;

import android.os.Bundle;
import android.app.Activity;
import android.content.Intent;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.webkit.ConsoleMessage;
import android.webkit.WebStorage;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.support.v4.app.NavUtils;

import com.codeplex.peerly.android.JsonNanoHTTPDJavascriptInterface;

import Peerly.AndroidSimpleHTTPServerRequestHandler;
import Peerly.SimpleJavascriptHttpServerAndroid;

public class WebViewActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_web_view);
        // Show the Up button in the action bar.
        setupActionBar();

        String databasePath = this.getFilesDir().getParent() + "/databases/";
        WebView myWebView = (WebView) findViewById(R.id.webview);
        myWebView.setWebChromeClient(new WebChromeClient() {
            public boolean onConsoleMessage(ConsoleMessage cm) {
                Log.d("MyApplication", cm.message() + " -- From line "
                        + cm.lineNumber() + " of "
                        + cm.sourceId());
                return true;
            }

            public void onExceededDatabaseQuota(String url, String databaseIdentifier, long quota, long estimatedDatabaseSize, long totalQuota, WebStorage.QuotaUpdater quotaUpdater) {
                // TODO:THIS IS SO BOGUS IT MAKES ME CRY (and opens a security hole the size of Alaska)
                quotaUpdater.updateQuota(estimatedDatabaseSize * 2);
            }
        });
        myWebView.getSettings().setJavaScriptEnabled(true);
        myWebView.getSettings().setAppCacheEnabled(true);
        myWebView.getSettings().setAppCachePath(databasePath);
        myWebView.getSettings().setAllowFileAccessFromFileURLs(true); // I believe this is not true by default
        myWebView.getSettings().setAllowUniversalAccessFromFileURLs(true); // To enable us to ignore cross domain restrictions
        myWebView.getSettings().setDatabaseEnabled(true); // We need to enable the database since that's core to PouchDB
        myWebView.getSettings().setDatabasePath(databasePath);
        myWebView.getSettings().setDomStorageEnabled(true); // We really don't need this but for now I want all APIs available
        myWebView.addJavascriptInterface(new JsonNanoHTTPDJavascriptInterface(myWebView), "SimpleJavascriptHttpServerAndroid");
        String htmlFileToLoad = "file:///android_asset/MicroBlogger/MicroBlogger.html"; //"file:///android_asset/test.html";
        myWebView.loadUrl(htmlFileToLoad);
    }

    /**
     * Set up the {@link android.app.ActionBar}.
     */
    private void setupActionBar() {

        getActionBar().setDisplayHomeAsUpEnabled(true);

    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.web_view, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                // This ID represents the Home or Up button. In the case of this
                // activity, the Up button is shown. Use NavUtils to allow users
                // to navigate up one level in the application structure. For
                // more details, see the Navigation pattern on Android Design:
                //
                // http://developer.android.com/design/patterns/navigation.html#up-vs-back
                //
                NavUtils.navigateUpFromSameTask(this);
                return true;
        }
        return super.onOptionsItemSelected(item);
    }

}
