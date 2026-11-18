import SwiftUI

@main
struct LingoraApp: App {
    var body: some Scene {
        WindowGroup {
            StudyView()
                .background(Color(red: 249/255, green: 250/255, blue: 245/255).ignoresSafeArea())
                .preferredColorScheme(.light)
        }
    }
}
