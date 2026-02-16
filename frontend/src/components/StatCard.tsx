import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  sx?: SxProps<Theme>;
}

export default function StatCard({ title, value, subtitle, sx }: StatCardProps) {
  return (
    <Card sx={sx}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
