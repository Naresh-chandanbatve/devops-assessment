variable "location" {
  description = "Azure region"
  type        = string
  default     = "Central India"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "project_name" {
  type    = string
  default = "vexardrive"
}


variable "postgres_admin_username" {
  type      = string
  sensitive = true
}

variable "postgres_admin_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}