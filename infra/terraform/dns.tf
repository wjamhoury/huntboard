# -----------------------------------------------------------------------------
# Route 53 DNS
# -----------------------------------------------------------------------------

# Hosted zone for huntboard.app
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "${var.app_name}-zone"
  }
}

# A record: huntboard.app -> CloudFront distribution (alias)
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
