import SwiftUI
import WebKit
import AVFoundation

struct StudyView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "lingora")
        config.userContentController.addScriptMessageHandler(context.coordinator.accountHandler, contentWorld: .page, name: "lingoraAccount")
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.isOpaque = false
        view.backgroundColor = .clear
        context.coordinator.load(in: view)
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}

    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        coordinator.stop()
        view.configuration.userContentController.removeScriptMessageHandler(forName: "lingora")
        view.configuration.userContentController.removeScriptMessageHandler(forName: "lingoraAccount", contentWorld: .page)
        view.navigationDelegate = nil
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, AVSpeechSynthesizerDelegate {
        let accountHandler = AccountHandler()
        private static let stateKey = "lingora.school.state"
        private lazy var synthesizer: AVSpeechSynthesizer = {
            let speech = AVSpeechSynthesizer()
            speech.delegate = self
            return speech
        }()
        private weak var view: WKWebView?
        private var lastUtterance: AVSpeechUtterance?
        private var activeToken: Int?
        private let startURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web")
        private var audioActive = false

        func load(in view: WKWebView) {
            self.view = view
            guard let url = startURL else { return }
            let controller = view.configuration.userContentController
            controller.removeAllUserScripts()
            let saved = UserDefaults.standard.string(forKey: Self.stateKey) ?? ""
            let encoded = (try? JSONEncoder().encode(saved)).flatMap { String(data: $0, encoding: .utf8) } ?? "\"\""
            let bootstrap = WKUserScript(source: "window.lingoraInitialState = \(encoded);",
                                         injectionTime: .atDocumentStart, forMainFrameOnly: true)
            controller.addUserScript(bootstrap)
            view.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { stop(); load(in: webView) }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url, url.isFileURL, url.standardizedFileURL.path == startURL?.standardizedFileURL.path,
                  action.targetFrame?.isMainFrame == true else { decisionHandler(.cancel); return }
            decisionHandler(.allow)
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
                  let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
            switch action {
            case "save":
                if let value = body["value"] as? String, value.utf8.count < 4_000_000 {
                    UserDefaults.standard.set(value, forKey: Self.stateKey)
                }
            case "stop": stop()
            case "speak":
                guard let token = body["token"] as? Int else { return }
                guard let lang = body["language"] as? String, ["en-GB", "es-ES"].contains(lang),
                      let lines = body["lines"] as? [String], (1...12).contains(lines.count),
                      lines.allSatisfy({ !$0.isEmpty && $0.count <= 4000 }) else {
                    report(token: token, failed: true)
                    return
                }
                speak(lines, language: lang, token: token)
            default: break
            }
        }

        private func speak(_ lines: [String], language: String, token: Int) {
            stop()
            guard let voice = AVSpeechSynthesisVoice(language: language) else {
                report(token: token, failed: true)
                return
            }
            do {
                let audio = AVAudioSession.sharedInstance()
                try audio.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
                try audio.setActive(true)
                audioActive = true
            } catch { report(token: token, failed: true); return }
            activeToken = token
            for (index, line) in lines.enumerated() {
                let utterance = AVSpeechUtterance(string: line)
                utterance.voice = voice
                utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.85
                utterance.postUtteranceDelay = index == lines.count - 1 ? 0 : 0.22
                if index == lines.count - 1 { lastUtterance = utterance }
                synthesizer.speak(utterance)
            }
        }

        func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
            guard utterance === lastUtterance, let token = activeToken else { return }
            lastUtterance = nil
            activeToken = nil
            deactivateAudio()
            report(token: token, failed: false)
        }

        func stop() {
            lastUtterance = nil
            activeToken = nil
            if synthesizer.isSpeaking { synthesizer.stopSpeaking(at: .immediate) }
            deactivateAudio()
        }

        private func deactivateAudio() {
            if audioActive {
                try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
                audioActive = false
            }
        }

        private func report(token: Int, failed: Bool) {
            let value = failed ? "true" : "false"
            view?.evaluateJavaScript("window.lingoraSpeechResult && window.lingoraSpeechResult(\(token),\(value))", completionHandler: nil)
        }
    }
}

private final class SameOriginTransport: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

final class AccountHandler: NSObject, WKScriptMessageHandlerWithReply {
    private let origin = "https://lingora-account.demetrio-barreca1987.chatgpt.site"
    private let files = DispatchQueue(label: "app.lingora.profile-files")
    private let transport = SameOriginTransport()
    private lazy var client: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.httpCookieStorage = nil
        config.urlCredentialStorage = nil
        config.timeoutIntervalForRequest = 6
        config.timeoutIntervalForResource = 12
        return URLSession(configuration: config, delegate: transport, delegateQueue: nil)
    }()

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
              let input = message.body as? [String: Any], let action = input["action"] as? String else {
            replyHandler(nil,"Richiesta non valida");return
        }
        if action == "read" || action == "write" {
            guard let key = input["key"] as? String, key.range(of:"^[a-f0-9]{64}$",options:.regularExpression) != nil else { replyHandler(nil,"Profilo non valido");return }
            let value = input["value"] as? String
            files.async {
                do {
                    let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
                    let dir = base.appendingPathComponent("Profili",isDirectory:true)
                    try FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true)
                    let url = dir.appendingPathComponent(key)
                    let result: String
                    if action == "read" {
                        result = FileManager.default.fileExists(atPath:url.path) ? try String(contentsOf:url,encoding:.utf8) : ""
                    } else {
                        guard let value = value, value.utf8.count <= 10_000_000 else {throw CocoaError(.fileWriteUnknown)}
                        try Data(value.utf8).write(to:url,options:[.atomic,.completeFileProtectionUntilFirstUserAuthentication])
                        result = "ok"
                    }
                    DispatchQueue.main.async {replyHandler(result,nil)}
                } catch {DispatchQueue.main.async {replyHandler(nil,"Impossibile leggere o salvare il profilo.")}}
            }
            return
        }
        guard action == "request", let path = input["path"] as? String, let method = input["method"] as? String,
              let proof = input["proof"] as? String, let payload = input["body"] as? String,
              payload.utf8.count <= 2_000_000,
              (path == "/v1/status" && method == "GET") || (path.range(of:"^/v1/profile/[a-f0-9]{64}$",options:.regularExpression) != nil && proof.range(of:"^[a-f0-9]{64}$",options:.regularExpression) != nil && ["GET","POST","PUT"].contains(method)),
              let url = URL(string:origin + path) else {replyHandler(nil,"Richiesta non valida");return}
        var req=URLRequest(url:url)
        req.httpMethod=method
        req.setValue("application/json",forHTTPHeaderField:"Accept")
        if !proof.isEmpty { req.setValue("Bearer " + proof,forHTTPHeaderField:"Authorization") }
        if method != "GET" {req.httpBody=Data(payload.utf8);req.setValue("application/json",forHTTPHeaderField:"Content-Type")}
        client.dataTask(with:req) {data,response,_ in
            let http=response as? HTTPURLResponse
            let valid=http?.mimeType=="application/json" && (data?.count ?? 0)<=2_100_000
            let status=valid ? (http?.statusCode ?? 503) : 503
            let body=valid ? data.flatMap{String(data:$0,encoding:.utf8)} ?? "" : ""
            DispatchQueue.main.async {replyHandler(["status":status,"text":body],nil)}
        }.resume()
    }
}
