RedmineApp::Application.routes.draw do
  post 'journal_navigator/preferences', to: 'journal_navigator_preferences#update'
end
