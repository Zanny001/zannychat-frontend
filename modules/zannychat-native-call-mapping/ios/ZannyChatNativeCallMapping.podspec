Pod::Spec.new do |s|
  s.name           = 'ZannyChatNativeCallMapping'
  s.version        = '0.1.0'
  s.summary        = 'Secure native call event mapping for ZannyChat'
  s.description    = 'Stores short-lived call reconciliation credentials in the iOS Keychain.'
  s.homepage       = 'https://github.com/Zanny001/zannychat-frontend'
  s.license        = { :type => 'MIT' }
  s.author         = 'ZannyChat'
  s.source         = { :git => 'https://github.com/Zanny001/zannychat-frontend.git', :tag => s.version.to_s }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.static_framework = true
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
end
