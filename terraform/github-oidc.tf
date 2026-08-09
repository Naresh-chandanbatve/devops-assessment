resource "azurerm_user_assigned_identity" "github_actions" {
  name                = "${local.name_prefix}-github-actions"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = local.tags
}

resource "azurerm_federated_identity_credential" "github_actions" {
  name = "github-main"

  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_actions.id

  issuer   = "https://token.actions.githubusercontent.com"
  subject  = "repo:Naresh-chandanbatve@70953218/devops-assessment@1327205384:ref:refs/heads/main"
  audience = ["api://AzureADTokenExchange"]
}

resource "azurerm_role_assignment" "github_actions" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}