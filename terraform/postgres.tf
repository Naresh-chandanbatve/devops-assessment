resource "azurerm_postgresql_flexible_server" "main" {
  name                = "${local.name_prefix}-postgres"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  version = "16"
  zone    = "2"

  delegated_subnet_id           = azurerm_subnet.postgres.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false

  administrator_login    = var.postgres_admin_username
  administrator_password = var.postgres_admin_password

  storage_mb = 32768
  sku_name   = "B_Standard_B1ms"

  backup_retention_days = 7

  tags = local.tags

  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.postgres
  ]
}