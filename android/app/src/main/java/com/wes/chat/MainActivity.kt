package com.wes.chat

import android.content.Context
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.platform.LocalContext
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.core.content.FileProvider
import android.provider.MediaStore
import java.io.File
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import android.app.Activity

import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    private var tempCameraUri: Uri? = null
    private var mainWebView: WebView? = null
    private var tts: TextToSpeech? = null

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) {
                    this@MainActivity.runOnUiThread {
                        mainWebView?.evaluateJavascript("javascript:if(window.onAndroidSpeakEnd) { window.onAndroidSpeakEnd('$utteranceId'); }", null)
                    }
                }
                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    this@MainActivity.runOnUiThread {
                        mainWebView?.evaluateJavascript("javascript:if(window.onAndroidSpeakEnd) { window.onAndroidSpeakEnd('$utteranceId'); }", null)
                    }
                }
            })
        }
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun exitApp() {
            this@MainActivity.runOnUiThread {
                finish()
            }
        }

        @JavascriptInterface
        fun copyToClipboard(text: String) {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("Copied Text", text)
            clipboard.setPrimaryClip(clip)
            this@MainActivity.runOnUiThread {
                android.widget.Toast.makeText(this@MainActivity, "Copied to clipboard", android.widget.Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun speakText(text: String, msgId: String) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, msgId)
        }

        @JavascriptInterface
        fun stopSpeaking() {
            tts?.stop()
        }

        @JavascriptInterface
        fun openDocument(base64Data: String, mimeType: String, fileName: String) {
            try {
                val file = File(externalCacheDir, fileName)
                val cleanBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
                val bytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT)
                file.writeBytes(bytes)
                
                val uri = FileProvider.getUriForFile(
                    this@MainActivity,
                    "${applicationContext.packageName}.fileprovider",
                    file
                )
                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW)
                intent.setDataAndType(uri, mimeType)
                intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                startActivity(android.content.Intent.createChooser(intent, "Open File"))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @JavascriptInterface
        fun startVoiceRecognition() {
            val intent = android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT, "Speak now...")
            try {
                runOnUiThread {
                    speechLauncher.launch(intent)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    val resetJs = "window.dispatchEvent(new Event('nativeVoiceError'));"
                    mainWebView?.evaluateJavascript(resetJs, null)
                }
            }
        }
    }

    private val speechLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val results = data?.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS)
            val spokenText = results?.get(0) ?: ""
            if (spokenText.isNotEmpty()) {
                val escaped = spokenText.replace("'", "\\'")
                val jsCode = "window.dispatchEvent(new CustomEvent('nativeVoiceResult', { detail: '$escaped' }));"
                mainWebView?.evaluateJavascript(jsCode, null)
            }
        }
        val resetJs = "window.dispatchEvent(new Event('nativeVoiceEnd'));"
        mainWebView?.evaluateJavascript(resetJs, null)
    }

    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data?.data
            val clipData = result.data?.clipData
            if (data != null) {
                filePathCallback?.onReceiveValue(arrayOf(data))
            } else if (clipData != null && clipData.itemCount > 0) {
                val uris = Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                filePathCallback?.onReceiveValue(uris)
            } else if (tempCameraUri != null) {
                filePathCallback?.onReceiveValue(arrayOf(tempCameraUri!!))
            } else {
                filePathCallback?.onReceiveValue(null)
            }
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
        tempCameraUri = null
    }

    private val permissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            pendingPermissionRequest?.grant(pendingPermissionRequest?.resources)
        } else {
            pendingPermissionRequest?.deny()
        }
        pendingPermissionRequest = null
    }

    private val requestStartupPermissionsLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { _ ->
        // Optional: handle if they deny
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        tts = TextToSpeech(this, this)
        
        val permissionsToRequest = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(android.Manifest.permission.RECORD_AUDIO)
        }
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(android.Manifest.permission.CAMERA)
        }
        if (permissionsToRequest.isNotEmpty()) {
            requestStartupPermissionsLauncher.launch(permissionsToRequest.toTypedArray())
        }

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color.Transparent
                ) {
                    ChatWebView()
                }
            }
        }
    }

    @Composable
    fun ChatWebView() {
        var webView by remember { mutableStateOf<WebView?>(null) }
        val context = LocalContext.current
        
        BackHandler(enabled = true) {
            webView?.evaluateJavascript(
                "javascript:if(window.onAndroidBackPressed && window.onAndroidBackPressed()) { 'consumed'; } else { AndroidApp.exitApp(); 'exit'; }"
            ) { result ->
                // The JS handles calling AndroidApp.exitApp() if it wasn't consumed
            }
        }

        AndroidView(
            modifier = Modifier.fillMaxSize().imePadding(),
            factory = { ctx ->
                WebView(ctx).apply {
                    webView = this
                    mainWebView = this
                    settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
                    clearCache(true)
                    addJavascriptInterface(WebAppInterface(), "AndroidApp")
                    webViewClient = WebViewClient()
                    webChromeClient = object : WebChromeClient() {
                        override fun onShowFileChooser(
                            webView: WebView?,
                            filePathCallback: ValueCallback<Array<Uri>>?,
                            fileChooserParams: FileChooserParams?
                        ): Boolean {
                            this@MainActivity.filePathCallback = filePathCallback
                            val defaultIntent = fileChooserParams?.createIntent()
                            
                            val photoFile = File(externalCacheDir, "camera_photo_${System.currentTimeMillis()}.jpg")
                            tempCameraUri = FileProvider.getUriForFile(
                                this@MainActivity,
                                "${applicationContext.packageName}.fileprovider",
                                photoFile
                            )
                            
                            val captureIntent = android.content.Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                            captureIntent.putExtra(MediaStore.EXTRA_OUTPUT, tempCameraUri)
                            captureIntent.addFlags(android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                            
                            val chooserIntent = android.content.Intent(android.content.Intent.ACTION_CHOOSER)
                            chooserIntent.putExtra(android.content.Intent.EXTRA_INTENT, defaultIntent)
                            chooserIntent.putExtra(android.content.Intent.EXTRA_TITLE, "Select File or Take Picture")
                            chooserIntent.putExtra(android.content.Intent.EXTRA_INITIAL_INTENTS, arrayOf(captureIntent))
                            
                            try {
                                fileChooserLauncher.launch(chooserIntent)
                            } catch (e: Exception) {
                                this@MainActivity.filePathCallback = null
                                return false
                            }
                            return true
                        }

                        override fun onPermissionRequest(request: PermissionRequest?) {
                            val requestedResources = request?.resources ?: return
                            val permissions = mutableListOf<String>()
                            if (requestedResources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                                permissions.add(android.Manifest.permission.RECORD_AUDIO)
                            }
                            if (requestedResources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                                permissions.add(android.Manifest.permission.CAMERA)
                            }
                            
                            if (permissions.isNotEmpty()) {
                                pendingPermissionRequest = request
                                permissionLauncher.launch(permissions.toTypedArray())
                            } else {
                                request.grant(requestedResources)
                            }
                        }
                    }
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.allowFileAccess = true
                    settings.allowContentAccess = true
                    settings.allowFileAccessFromFileURLs = true
                    settings.allowUniversalAccessFromFileURLs = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    addJavascriptInterface(NetworkBridge(context), "AndroidNetwork")
                    loadUrl("file:///android_asset/www/index.html")
                }
            }
        )
    }
}

class NetworkBridge(private val context: Context) {
    @JavascriptInterface
    fun getDeviceIp(): String {
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val ipAddress = wifiManager.connectionInfo.ipAddress
            if (ipAddress == 0) {
                ""
            } else {
                String.format(
                    "%d.%d.%d.%d",
                    ipAddress and 0xff,
                    ipAddress shr 8 and 0xff,
                    ipAddress shr 16 and 0xff,
                    ipAddress shr 24 and 0xff
                )
            }
        } catch (e: Exception) {
            ""
        }
    }
}
